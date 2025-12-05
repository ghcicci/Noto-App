import { BleManager, Device } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import * as ExpoDevice from 'expo-device';
import { Base64 } from 'js-base64'; // 없으면 global.atob / btoa 사용

const SERVICE_UUID = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
const RX_UUID      = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E'; // 앱 -> ESP32
const TX_UUID      = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E'; // ESP32 -> 앱

class BleService {
  manager: BleManager;
  device: Device | null = null;

  constructor() {
    this.manager = new BleManager();
  }

  async requestPermissions() {
    if (Platform.OS === 'android') {
      if ((ExpoDevice.platformApiLevel ?? -1) < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED
        );
      }
    }
    return true;
  }

  // ▼▼▼ [핵심 수정] 연결 상태를 확인하고 재사용하는 로직 추가 ▼▼▼
  async scanAndConnect(onConnected: (device: Device) => void) {
    console.log('Checking connection status...');

    // 1. 이미 잡고 있는 디바이스 객체가 있는지 확인
    if (this.device) {
      try {
        const isConnected = await this.device.isConnected();
        if (isConnected) {
          console.log('Already connected to:', this.device.name);
          // 이미 연결됨 -> 스캔 건너뛰고 바로 콜백 실행
          onConnected(this.device);
          return;
        }
      } catch (e) {
        console.log('Connection check failed, scanning again...');
        this.device = null; // 상태가 이상하면 초기화하고 다시 스캔
      }
    }

    // 2. 연결이 안 되어 있다면 스캔 시작
    console.log('Start Scanning...');
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log('Scan Error:', error);
        return;
      }

      if (device && device.name) {
        // 이름 확인 (ESP32 코드에 설정한 이름)
        const isTargetName = device.name.includes("ESP32") || device.name.includes("BLE");

        if (isTargetName) {
          console.log('Connecting to:', device.name);
          this.manager.stopDeviceScan(); // 스캔 중지

          device.connect()
            .then((device) => {
              return device.discoverAllServicesAndCharacteristics();
            })
            .then((device) => {
              this.device = device;
              console.log('Connected!');
              onConnected(device);
            })
            .catch((error) => {
              console.log('Connection Error:', error);
              this.device = null;
            });
        }
      }
    });
  }

  // 데이터 전송
  async sendData(message: string) {
    if (!this.device) {
        console.log("Device object is null");
        return;
    }

    // 연결 끊겼는지 재확인 (안전장치)
    const isConnected = await this.device.isConnected();
    if (!isConnected) {
        console.log("Device disconnected unexpectedly.");
        return;
    }

    // Base64 인코딩 (한글 전송 등을 위해선 UTF-8 변환 필요하지만 일단 기본 사용)
    // Expo 환경에서 btoa가 없다면 js-base64 라이브러리 사용 권장
    const base64Message = btoa(message);

    try {
      await this.device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        RX_UUID,
        base64Message
      );
      console.log('Sent:', message);
    } catch (e) {
      console.log('Send Error:', e);
    }
  }

  // 모니터링 (수신)
  startMonitoring(onReceive: (data: string) => void) {
    if (!this.device) return;

    this.device.monitorCharacteristicForService(
      SERVICE_UUID,
      TX_UUID,
      (error, characteristic) => {
        if (error) {
          // 연결이 끊겨서 에러가 날 수도 있음
          console.log('Monitoring Error (or Disconnected):', error.message);
          return;
        }

        const rawValue = characteristic?.value;
        if (rawValue) {
          const decoded = atob(rawValue);
          // console.log('Received:', decoded); // 로그 너무 많으면 주석
          onReceive(decoded);
        }
      }
    );
  }

  // (선택) 연결 끊기 함수 - 필요할 때 호출
  async disconnect() {
    if (this.device) {
        await this.device.cancelConnection();
        this.device = null;
        console.log("Disconnected");
    }
  }
}

export default new BleService();