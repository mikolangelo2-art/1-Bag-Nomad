// City & country coordinate lookup — [longitude, latitude]
// Used by IntelMap for phase markers and route lines
const CITY_COORDS = {
  // Caribbean & Central America
  'Utila': [-86.9, 16.1], 'Roatan': [-86.5, 16.3], 'La Ceiba': [-86.8, 15.8],
  'Honduras': [-86.2, 15.2], 'Belize City': [-88.2, 17.5], 'Caye Caulker': [-88.0, 17.7],
  'Belize': [-88.5, 17.2], 'Barbados': [-59.5, 13.2], 'Bridgetown': [-59.6, 13.1],
  'Costa Rica': [-83.8, 9.7], 'San Jose': [-84.1, 9.9], 'Panama': [-80.8, 8.5],
  'Panama City': [-79.5, 9.0], 'Colombia': [-74.3, 4.6], 'Bogota': [-74.1, 4.7],
  'Cartagena': [-75.5, 10.4], 'Mexico': [-102.5, 23.6], 'Mexico City': [-99.1, 19.4],
  'Tulum': [-87.5, 20.2], 'Cancun': [-86.8, 21.2],

  // Africa & Middle East
  'Egypt': [30.8, 26.8], 'Cairo': [31.2, 30.0], 'Luxor': [32.6, 25.7],
  'Hurghada': [33.8, 27.2], 'Dahab': [34.5, 28.5], 'Morocco': [-5.8, 31.8],
  'Marrakech': [-8.0, 31.6], 'Tanzania': [34.9, -6.4], 'Zanzibar': [39.2, -6.2],
  'Jordan': [36.2, 30.6], 'Amman': [35.9, 31.9],

  // South Asia
  'India': [78.9, 20.6], 'Delhi': [77.2, 28.6], 'Mumbai': [72.9, 19.1],
  'Goa': [74.0, 15.3], 'Varanasi': [83.0, 25.3], 'Jaipur': [75.8, 26.9],
  'Rishikesh': [78.3, 30.1], 'Sri Lanka': [80.8, 7.9], 'Colombo': [79.9, 6.9],
  'Nepal': [84.1, 28.4], 'Kathmandu': [85.3, 27.7],

  // Southeast Asia
  'Thailand': [100.9, 15.9], 'Bangkok': [100.5, 13.8], 'Chiang Mai': [98.9, 18.8],
  'Koh Tao': [100.0, 10.1], 'Koh Phangan': [100.0, 9.7], 'Phuket': [98.3, 7.9],
  'Krabi': [98.9, 8.1], 'Indonesia': [113.9, -0.8], 'Bali': [115.2, -8.4],
  'Komodo': [119.5, -8.5], 'Raja Ampat': [130.5, -0.5], 'Lombok': [116.3, -8.6],
  'Malaysia': [109.7, 4.2], 'Kuala Lumpur': [101.7, 3.1], 'Langkawi': [99.7, 6.4],
  'Sipadan': [118.6, 4.1], 'Vietnam': [108.3, 14.1], 'Hanoi': [105.8, 21.0],
  'Ho Chi Minh City': [106.7, 10.8], 'Cambodia': [104.9, 12.6],
  'Siem Reap': [103.9, 13.4], 'Phnom Penh': [104.9, 11.6],
  'Philippines': [122.9, 12.9], 'Manila': [121.0, 14.6], 'Cebu': [123.9, 10.3],
  'Palawan': [118.7, 9.8], 'Myanmar': [96.0, 21.9], 'Yangon': [96.2, 16.9],

  // East Asia
  'Japan': [138.2, 36.2], 'Tokyo': [139.7, 35.7], 'Osaka': [135.5, 34.7],
  'Kyoto': [135.8, 35.0], 'Okinawa': [127.7, 26.3],

  // Europe
  'Portugal': [-8.2, 39.6], 'Lisbon': [-9.1, 38.7], 'Porto': [-8.6, 41.2],
  'Greece': [21.8, 39.1], 'Athens': [23.7, 37.9], 'Santorini': [25.4, 36.4],
  'Italy': [12.6, 41.9], 'Rome': [12.5, 41.9], 'Florence': [11.3, 43.8],
  'France': [2.3, 46.2], 'Paris': [2.3, 48.9], 'Nice': [7.3, 43.7],
  'Spain': [-3.7, 40.4], 'Barcelona': [2.2, 41.4], 'Madrid': [-3.7, 40.4],
  'Slovenia': [14.5, 46.2], 'Ljubljana': [14.5, 46.1],

  // South America
  'Peru': [-76.0, -9.2], 'Lima': [-77.0, -12.0], 'Cusco': [-72.0, -13.5],

  // Oceania
  'Australia': [133.8, -25.3], 'Sydney': [151.2, -33.9], 'Melbourne': [144.9, -37.8],
  'Cairns': [145.8, -16.9], 'Alice Springs': [133.9, -23.7], 'Darwin': [130.8, -12.5],
  'Broome': [122.2, -17.9], 'New Zealand': [174.9, -40.9], 'Auckland': [174.8, -36.9],
  'Fiji': [178.0, -17.7], 'Suva': [178.4, -18.1],

  // Pacific
  'Maldives': [73.2, 3.2], 'Male': [73.5, 4.2],
};

export default CITY_COORDS;
