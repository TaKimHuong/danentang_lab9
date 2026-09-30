import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Keyboard,
  StatusBar,
} from 'react-native';
import * as Location from 'expo-location';

export default function ClimaScreen() {
  const [loading, setLoading] = useState<boolean>(true);
  const [cityName, setCityName] = useState<string>('Vị trí hiện tại');
  const [searchCity, setSearchCity] = useState<string>('');
  const [temperature, setTemperature] = useState<number | null>(null);
  const [weatherText, setWeatherText] = useState<string>('Đang cập nhật...');
  const [weatherIcon, setWeatherIcon] = useState<string>('🌤️');

  // Hàm chuyển đổi mã WMO Weather Code sang mô tả & icon
  const getWeatherInfo = (code: number) => {
    if (code === 0) return { text: 'Trời quang đãng', icon: '☀️' };
    if (code <= 3) return { text: 'Có mây rải rác', icon: '⛅' };
    if (code <= 48) return { text: 'Sương mù', icon: '🌫️' };
    if (code <= 67) return { text: 'Mưa rào nhẹ', icon: '🌧️' };
    if (code <= 77) return { text: 'Có tuyết rơi', icon: '❄️' };
    if (code <= 82) return { text: 'Mưa to xối xả', icon: '⛈️' };
    return { text: 'Dông bão', icon: '🌩️' };
  };

  // 1. Gọi dữ liệu thời tiết theo tọa độ GPS (Khai thác Web API)
  const fetchWeatherByCoords = async (latitude: number, longitude: number, label = 'Vị trí hiện tại') => {
    try {
      setLoading(true);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.current) {
        setTemperature(Math.round(data.current.temperature_2m));
        const info = getWeatherInfo(data.current.weather_code);
        setWeatherText(info.text);
        setWeatherIcon(info.icon);
        setCityName(label);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể kết nối lấy dữ liệu thời tiết trực tuyến.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Lấy vị trí GPS của thiết bị khi vừa mở app
  const getLocationAndWeather = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền bị từ chối', 'Vui lòng cấp quyền vị trí để lấy thời tiết tự động.');
        // Mặc định lấy thời tiết Hà Nội nếu người dùng từ chối cấp quyền GPS
        fetchWeatherByCoords(21.0285, 105.8542, 'Hà Nội');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await fetchWeatherByCoords(location.coords.latitude, location.coords.longitude, 'Vị trí của bạn');
    } catch {
      fetchWeatherByCoords(21.0285, 105.8542, 'Hà Nội');
    }
  };

  // 3. Tìm kiếm thời tiết theo tên thành phố (Geocoding API)
  const handleSearchCity = async () => {
    if (!searchCity.trim()) return;
    Keyboard.dismiss();
    try {
      setLoading(true);
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        searchCity.trim()
      )}&count=1&language=vi&format=json`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        Alert.alert('Không tìm thấy', 'Không tìm thấy thông tin thành phố này.');
        setLoading(false);
        return;
      }

      const target = geoData.results[0];
      await fetchWeatherByCoords(target.latitude, target.longitude, target.name);
      setSearchCity('');
    } catch {
      Alert.alert('Lỗi', 'Không thể tìm kiếm thành phố.');
      setLoading(false);
    }
  };

  useEffect(() => {
    getLocationAndWeather();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Thanh tìm kiếm và nút refresh vị trí */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.gpsBtn} onPress={getLocationAndWeather}>
          <Text style={styles.gpsBtnText}>📍</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Nhập tên thành phố..."
          placeholderTextColor="#94A3B8"
          value={searchCity}
          onChangeText={setSearchCity}
          onSubmitEditing={handleSearchCity}
        />

        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchCity}>
          <Text style={styles.searchBtnText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Nội dung thời tiết */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={styles.loadingText}>Đang tải dữ liệu thời tiết...</Text>
        </View>
      ) : (
        <View style={styles.weatherCard}>
          <Text style={styles.cityText}>{cityName}</Text>
          <Text style={styles.iconLarge}>{weatherIcon}</Text>
          <Text style={styles.tempText}>{temperature}°C</Text>
          <Text style={styles.descText}>{weatherText}</Text>
        </View>
      )}

      {/* Khung thông điệp footer */}
      <View style={styles.footer}>
        <Text style={styles.footerNote}>Dữ liệu trực tiếp từ Open-Meteo Web API</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  gpsBtn: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
  },
  gpsBtnText: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchBtn: {
    backgroundColor: '#0284C7',
    padding: 12,
    borderRadius: 12,
  },
  searchBtnText: {
    fontSize: 18,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 16,
  },
  weatherCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityText: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  iconLarge: {
    fontSize: 84,
    marginVertical: 12,
  },
  tempText: {
    color: '#FFFFFF',
    fontSize: 72,
    fontWeight: '900',
  },
  descText: {
    color: '#38BDF8',
    fontSize: 22,
    fontWeight: '600',
    marginTop: 8,
  },
  footer: {
    paddingBottom: 24,
    alignItems: 'center',
  },
  footerNote: {
    color: '#64748B',
    fontSize: 14,
  },
});