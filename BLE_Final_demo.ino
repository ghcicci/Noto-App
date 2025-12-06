#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <ESP32Servo.h>
#include <Adafruit_ThinkInk.h>
#include <Adafruit_GFX.h>
#include <Adafruit_EPD.h>

// ===== BLE UUID Configuration =====
#define SERVICE_UUID           "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_RX "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_TX "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

// ===== E-Ink Pin Configuration =====
#define EPD_CS     5
#define EPD_DC     17
#define EPD_MISO   19
#define EPD_RST    4
#define EPD_BUSY   0
#define EPD_CLK    18
#define EPD_SID    23
#define EPD_SPI    &SPI
#define SRAM_CS    16

// ===== Servo Configuration =====
#define SERVO_PIN      32
#define SERVO_UNLOCK   0   // 열림 각도
#define SERVO_LOCK     90  // 잠금 각도

ThinkInk_370_Mono_BAAMFGN display(EPD_DC, EPD_RST, EPD_CS, SRAM_CS, EPD_BUSY, EPD_SPI);

// ===== Button Pins =====
const int BTN_PINS[4] = {33, 25, 26, 27}; 

// ===== Globals =====
BLEServer* pServer = nullptr;
BLECharacteristic* pTxCharacteristic = nullptr;
bool deviceConnected = false;
bool dataReceived = false;
String rxBuffer = "";

Servo myservo;
int session_on = 0;       // 0: Standby, 1: Focus(Locked), 2: Home
bool is_locked = false;

String currentTime = "--:--"; 
String taskTexts[4] = {"", "", "", ""};
bool taskActive[4] = {false, false, false, false};
bool taskDone[4] = {false, false, false, false};

int waitingForTaskIndex = -1;
bool waitingForTime = false;

unsigned long lastDebounceTime[4] = {0, 0, 0, 0};
const unsigned long debounceDelay = 200;

// ===== BLE Callbacks =====
class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("Device Connected");
  }
  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    BLEDevice::startAdvertising();
    Serial.println("Device Disconnected");
  }
};

class MyCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String value = pCharacteristic->getValue();
    if (value.length() > 0) {
      for (int i = 0; i < value.length(); i++) {
        rxBuffer += value[i];
      }
      dataReceived = true; 
    }
  }
};

// ===== Utility Functions =====
void btPrint(const String& s) {
  if (deviceConnected && pTxCharacteristic != nullptr) {
    pTxCharacteristic->setValue(s.c_str());
    pTxCharacteristic->notify();
  }
}

void btPrintln(const String& s) {
  btPrint(s + "\n");
}

// ===== Display Function =====
void updateDisplay() {
  Serial.print("Refreshing Display... Mode: "); Serial.println(session_on);
  
  display.powerUp(); 
  display.clearBuffer();
  display.setCursor(0, 0);
  display.setTextColor(EPD_BLACK);

  // [Mode 1] FOCUS MODE
  if (session_on == 1) {
    if (!is_locked) {
      display.setTextSize(2); display.println("Focus Mode");
      display.println("----------------");
      display.setCursor(0, 60); display.setTextSize(3); display.println("Insert Phone");
      display.setTextSize(2); display.setCursor(0, 100); display.println("& Press Button");
      display.println("  to LOCK");
    } else {
      display.setTextSize(2); display.println("Focus Mode [LOCKED]");
      display.setTextSize(3); display.setCursor(0, 30); display.println(currentTime);
      display.setTextSize(2); display.setCursor(0, 60); display.println("----------------");
      for(int i=0; i<4; i++) {
        if(taskActive[i]) {
          display.print(i+1); display.print(". ");
          if(taskDone[i]) { display.print("[V] "); display.println(taskTexts[i]); }
          else { display.print("[ ] "); display.println(taskTexts[i]); }
        }
      }
    }
  } 
  // [Mode 2] HOME MODE
  else if (session_on == 2) {
    display.setTextSize(2); display.println("Home Mode");
    display.setTextSize(3); display.setCursor(0, 30); display.println(currentTime);
    display.setTextSize(2); display.setCursor(0, 60); display.println("----------------");
    for(int i=0; i<4; i++) {
      if(taskActive[i]) {
        display.print(i+1); display.print(". ");
        if(taskDone[i]) { display.print("[V] "); display.println(taskTexts[i]); }
        else { display.print("[ ] "); display.println(taskTexts[i]); }
      }
    }
  }
  // [Mode 0] STANDBY
  else {
    display.setTextSize(2);
    display.setCursor(0, 50); display.println("Ready to Focus");
    display.setCursor(0, 80); display.println("Waiting for Sync...");
  }
  
  display.display(); 
  Serial.println("Refresh Done!");
}

// ===== Command Processing =====
void applyCmd(String s) {
  s.trim();
  if (s.length() == 0) return;
  Serial.println("Processing: [" + s + "]"); 

  String up = s;
  up.toUpperCase();

  bool isCommand = (up == "HOME" || up == "FOCUS" || up == "TIME" || up == "ON" || up == "STOP" || up.startsWith("TASK"));

  if (isCommand) {
    if (waitingForTaskIndex != -1 || waitingForTime) {
      Serial.println("Warning: Unexpected command. Resetting wait flags.");
      waitingForTaskIndex = -1;
      waitingForTime = false;
    }
  }

  // 1. Receive Task Content
  if (waitingForTaskIndex != -1) {
    int idx = waitingForTaskIndex;
    taskTexts[idx] = s;
    btPrintln("Task " + String(idx + 1) + " Saved");
    Serial.println("Saved Task Content");
    waitingForTaskIndex = -1;
    return;
  }

  // 2. Receive Time Content
  if (waitingForTime) {
    currentTime = s;
    btPrintln("Time Saved: " + s);
    Serial.println("Saved Time: " + s);
    waitingForTime = false;
    return;
  }

  // 3. Process Commands
  if (up == "ON") {
    btPrintln("OK: Refreshing...");
    updateDisplay();
    return;
  }

  if (up == "FOCUS") {
    btPrintln("OK: Mode -> FOCUS");
    session_on = 1;
    is_locked = false;
    // 서보를 열림 상태로 초기화
    myservo.write(SERVO_UNLOCK);
    return;
  }

  if (up == "HOME") {
    btPrintln("OK: Mode -> HOME");
    session_on = 2; 
    is_locked = false;
    myservo.write(SERVO_UNLOCK);
    return;
  }

  if (up == "STOP") {
    btPrintln("OK: STOP & Reset");
    session_on = 0;
    is_locked = false;
    myservo.write(SERVO_UNLOCK);
    for(int i=0; i<4; i++) {
      taskActive[i] = false;
      taskDone[i] = false;
      taskTexts[i] = "";
    }
    currentTime = "--:--";
    updateDisplay(); 
    return;
  }

  if (up == "TIME") {
    Serial.println("Waiting for Time...");
    waitingForTime = true;
    return;
  }

  if (up.startsWith("TASK")) {
    int taskNum = up.substring(4).toInt(); 
    if (taskNum >= 1 && taskNum <= 4) {
      int idx = taskNum - 1;
      waitingForTaskIndex = idx;
      taskActive[idx] = true;
      taskDone[idx] = false; 
      Serial.println("Waiting for Task " + String(taskNum));
      return;
    }
  }
}

// ===== Button Logic =====
void checkButtons() {
  if (session_on == 0) return;

  for (int i = 0; i < 4; i++) {
    // Schematic: Pull-down (Active HIGH)
    if (digitalRead(BTN_PINS[i]) == HIGH) { 
      if (millis() - lastDebounceTime[i] > debounceDelay) {
        lastDebounceTime[i] = millis();

        // 1. FOCUS Mode + Unlocked -> Lock it
        if (session_on == 1 && !is_locked) {
          btPrintln("Locking...");
          // 서보 잠금 동작
          myservo.write(SERVO_LOCK);
          delay(500); 
          
          is_locked = true;
          btPrintln("LOCKED");
          updateDisplay(); 
        }
        // 2. FOCUS Locked OR HOME Mode -> Complete Task
        else {
           if (taskActive[i] && !taskDone[i]) {
              taskDone[i] = true;
              
              String msg = "task" + String(i + 1) + "_done";
              btPrintln(msg);
              Serial.println("Sent: " + msg);
              
              updateDisplay();
           }
        }
      }
    }
  }
}

void setup() {
  Serial.begin(9600);

  // [서보 설정 수정] TowerPro SG51R/SG90을 위한 보정
  myservo.setPeriodHertz(50); // 표준 50Hz 서보
  myservo.attach(SERVO_PIN, 500, 2400); // 펄스 폭 범위 지정 (중요)
  
  // [부팅 시 서보 테스트] 움직임 확인용 (Wiggle)
  Serial.println("Servo Test: 0 -> 90 -> 0");
  myservo.write(0);
  delay(500);
  myservo.write(90);
  delay(500);
  myservo.write(0);
  delay(500);

  // Display Driver Enable Pin
  pinMode(2, OUTPUT); 
  digitalWrite(2, HIGH); 

  // Button Pins
  for(int i=0; i<4; i++) pinMode(BTN_PINS[i], INPUT);

  BLEDevice::init("ESP32-BLE");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  BLEService* pService = pServer->createService(SERVICE_UUID);

  pTxCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_UUID_TX,
                        BLECharacteristic::PROPERTY_NOTIFY
                      );
  pTxCharacteristic->addDescriptor(new BLE2902());

  BLECharacteristic* pRxCharacteristic = pService->createCharacteristic(
                                           CHARACTERISTIC_UUID_RX,
                                           BLECharacteristic::PROPERTY_WRITE
                                         );
  pRxCharacteristic->setCallbacks(new MyCallbacks());
  pService->start();
  
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); 
  BLEDevice::startAdvertising();

  display.begin(THINKINK_MONO);
  display.setRotation(0);
  display.clearBuffer();
  display.setTextSize(2);
  display.setTextColor(EPD_BLACK);
  display.setCursor(0, 0);
  display.println("System Ready");
  display.display();
  
  updateDisplay();
}

void loop() {
  if (dataReceived) {
    String cmd = rxBuffer;
    rxBuffer = ""; 
    dataReceived = false;
    applyCmd(cmd);
  }

  if (session_on == 0)
  {
    myservo.write(SERVO_UNLOCK);
  }

  checkButtons();
  delay(100); 
}