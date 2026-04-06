// City & country coordinate lookup — [longitude, latitude]
// Used by IntelMap for phase markers and route lines
const CITY_COORDS = {
  // United States
  'United States': [-98.6, 39.5], 'USA': [-98.6, 39.5],
  'New Orleans': [-90.1, 29.9], 'New Orleans, Louisiana': [-90.1, 29.9],
  'Nashville': [-86.8, 36.2], 'Nashville, Tennessee': [-86.8, 36.2],
  'Memphis': [-90.0, 35.1], 'Memphis, Tennessee': [-90.0, 35.1],
  'New York City': [-74.0, 40.7], 'New York': [-74.0, 40.7], 'NYC': [-74.0, 40.7],
  'Los Angeles': [-118.2, 34.1], 'LA': [-118.2, 34.1],
  'San Francisco': [-122.4, 37.8], 'Chicago': [-87.6, 41.9],
  'Miami': [-80.2, 25.8], 'Miami Beach': [-80.1, 25.8],
  'Austin': [-97.7, 30.3], 'Houston': [-95.4, 29.8], 'Dallas': [-96.8, 32.8],
  'Denver': [-104.9, 39.7], 'Seattle': [-122.3, 47.6], 'Portland': [-122.7, 45.5],
  'Boston': [-71.1, 42.4], 'Washington DC': [-77.0, 38.9], 'Washington D.C.': [-77.0, 38.9],
  'Las Vegas': [-115.1, 36.2], 'Phoenix': [-112.1, 33.4], 'Atlanta': [-84.4, 33.7],
  'Charleston': [-79.9, 32.8], 'Savannah': [-81.1, 32.1], 'Key West': [-81.8, 24.6],
  'New Orleans Louisiana': [-90.1, 29.9],

  // Airport name aliases — where airport name ≠ city name (post-strip lookup)
  'Logan': [-71.1, 42.4],                          // Logan Intl → Boston
  'O\'Hare': [-87.9, 42.0], 'Ohare': [-87.9, 42.0], // O'Hare → Chicago
  'Midway': [-87.7, 41.8],                          // Midway → Chicago
  'Dulles': [-77.5, 38.9],                          // Dulles → Washington DC
  'Reagan': [-77.0, 38.9], 'National': [-77.0, 38.9], // Reagan National → DC
  'Hartsfield': [-84.4, 33.6], 'Hartsfield-Jackson': [-84.4, 33.6], // → Atlanta
  'Orlando': [-81.4, 28.4], 'Sanford': [-81.2, 28.8], // Florida airports
  'Salt Lake': [-111.9, 40.8], 'Salt Lake City': [-111.9, 40.8],
  'Minneapolis': [-93.2, 44.9], 'St. Paul': [-93.1, 44.9],
  'Detroit': [-83.0, 42.4], 'Charlotte': [-80.9, 35.2],
  'Baltimore': [-76.6, 39.2], 'BWI': [-76.7, 39.2],
  'Newark': [-74.2, 40.7], 'JFK': [-73.8, 40.6], 'LaGuardia': [-73.9, 40.8],
  'Burbank': [-118.4, 34.2], 'Ontario': [-117.6, 34.1], 'Long Beach': [-118.2, 33.8],
  'San Jose': [-121.9, 37.4], 'Oakland': [-122.2, 37.7],
  'Raleigh': [-78.8, 35.9], 'Pittsburgh': [-80.0, 40.5], 'Cleveland': [-81.9, 41.4],
  'Indianapolis': [-86.2, 39.8], 'Kansas City': [-94.6, 39.1],
  'Sacramento': [-121.5, 38.6], 'Tucson': [-110.9, 32.1], 'Albuquerque': [-106.7, 35.1],
  'Anchorage': [-150.0, 61.2], 'Fairbanks': [-147.9, 64.8],

  // International airport name aliases
  'Heathrow': [-0.5, 51.5], 'Gatwick': [-0.2, 51.2], 'Stansted': [0.2, 51.9],
  'Luton': [-0.4, 51.9], 'City': [-0.1, 51.5],                    // London airports
  'Charles de Gaulle': [2.5, 49.0], 'CDG': [2.5, 49.0],           // Paris
  'Orly': [2.4, 48.7],                                              // Paris Orly
  'Schiphol': [4.8, 52.3],                                          // Amsterdam
  'Frankfurt': [8.7, 50.0],                                         // Frankfurt airport
  'Changi': [104.0, 1.4],                                           // Singapore
  'Narita': [140.4, 35.8], 'Haneda': [139.8, 35.5],                // Tokyo airports
  'Incheon': [126.5, 37.5],                                         // Seoul
  'Suvarnabhumi': [100.8, 13.7], 'Don Mueang': [100.6, 13.9],      // Bangkok
  'Kingsford Smith': [151.2, -33.9],                                // Sydney
  'Tullamarine': [144.8, -37.7],                                    // Melbourne
  'Pearson': [-79.6, 43.7],                                         // Toronto
  'Trudeau': [-73.7, 45.5],                                         // Montreal
  'Vancouver': [-123.2, 49.2],                                      // Vancouver airport
  'Hamad': [51.6, 25.3],                                            // Doha Qatar
  'Al Maktoum': [55.2, 24.9], 'Dubai World Central': [55.2, 24.9], // Dubai
  'Ben Gurion': [34.9, 32.0],                                       // Tel Aviv

  // Cuba & Caribbean
  'Cuba': [-79.5, 22.0], 'Havana': [-82.4, 23.1], 'Trinidad, Cuba': [-79.9, 21.8],
  'Trinidad': [-79.9, 21.8], 'Varadero': [-81.2, 23.1], 'Cienfuegos': [-80.4, 22.1],
  'Santiago de Cuba': [-75.8, 20.0], 'Viñales': [-83.7, 22.6], 'Vinales': [-83.7, 22.6],
  'Jamaica': [-77.3, 18.1], 'Kingston': [-76.8, 18.0], 'Montego Bay': [-77.9, 18.5],
  'Barbados': [-59.5, 13.2], 'Bridgetown': [-59.6, 13.1],
  'Dominican Republic': [-70.2, 18.7], 'Santo Domingo': [-69.9, 18.5], 'Punta Cana': [-68.4, 18.6],
  'Puerto Rico': [-66.6, 18.2], 'San Juan': [-66.1, 18.5],

  // Caribbean & Central America
  'Utila': [-86.9, 16.1], 'Roatan': [-86.5, 16.3], 'La Ceiba': [-86.8, 15.8],
  'Honduras': [-86.2, 15.2], 'Belize City': [-88.2, 17.5], 'Caye Caulker': [-88.0, 17.7],
  'Belize': [-88.5, 17.2], 'Costa Rica': [-83.8, 9.7], 'San Jose': [-84.1, 9.9],
  'Panama': [-80.8, 8.5], 'Panama City': [-79.5, 9.0], 'Colombia': [-74.3, 4.6],
  'Bogota': [-74.1, 4.7], 'Bogotá': [-74.1, 4.7],
  'Cartagena': [-75.5, 10.4], 'Mexico': [-102.5, 23.6], 'Mexico City': [-99.1, 19.4],
  'Tulum': [-87.5, 20.2], 'Cancun': [-86.8, 21.2], 'Oaxaca': [-96.7, 17.1],
  'Puerto Vallarta': [-105.2, 20.6], 'Puerto Vallarta Historic Center': [-105.2, 20.6],
  'Guadalajara': [-103.4, 20.7], 'San Miguel de Allende': [-100.7, 20.9],
  'Cabo San Lucas': [-109.9, 22.9], 'Los Cabos': [-109.7, 23.1],
  'Playa del Carmen': [-87.1, 20.6], 'Cozumel': [-86.9, 20.5],
  'Merida': [-89.6, 20.9], 'San Cristobal de las Casas': [-92.6, 16.7],

  // South America
  'Brazil': [-51.9, -14.2], 'São Paulo': [-46.6, -23.5], 'Rio de Janeiro': [-43.2, -22.9],
  'Salvador': [-38.5, -12.9], 'Florianópolis': [-48.5, -27.6], 'Florianopolis': [-48.5, -27.6],
  'Foz do Iguaçu': [-54.6, -25.5], 'Manaus': [-60.0, -3.1], 'Recife': [-34.9, -8.1],
  'Argentina': [-63.6, -38.4], 'Buenos Aires': [-58.4, -34.6], 'Mendoza': [-68.8, -32.9],
  'Bariloche': [-71.3, -41.1], 'Patagonia': [-70.0, -44.0],
  'Chile': [-71.5, -35.7], 'Santiago': [-70.7, -33.5], 'Valparaíso': [-71.6, -33.0], 'Valparaiso': [-71.6, -33.0],
  'Peru': [-76.0, -9.2], 'Lima': [-77.0, -12.0], 'Cusco': [-72.0, -13.5],
  'Machu Picchu': [-72.5, -13.2], 'Arequipa': [-71.5, -16.4],
  'Bolivia': [-64.7, -17.0], 'La Paz': [-68.2, -16.5], 'Sucre': [-65.3, -19.0],
  'Ecuador': [-78.1, -1.8], 'Quito': [-78.5, -0.2], 'Galapagos': [-90.4, -0.7],
  'Venezuela': [-66.6, 6.4], 'Caracas': [-66.9, 10.5],
  'Uruguay': [-56.0, -32.5], 'Montevideo': [-56.2, -34.9],

  // Africa & Middle East
  'Egypt': [30.8, 26.8], 'Cairo': [31.2, 30.0], 'Luxor': [32.6, 25.7],
  'Hurghada': [33.8, 27.2], 'Dahab': [34.5, 28.5], 'Sharm el-Sheikh': [34.5, 27.9],
  'Morocco': [-5.8, 31.8], 'Marrakech': [-8.0, 31.6], 'Fez': [-5.0, 34.0],
  'Chefchaouen': [-5.3, 35.2], 'Casablanca': [-7.6, 33.6], 'Essaouira': [-9.8, 31.5],
  'Tanzania': [34.9, -6.4], 'Zanzibar': [39.2, -6.2], 'Dar es Salaam': [39.3, -6.8],
  'Jordan': [36.2, 30.6], 'Amman': [35.9, 31.9], 'Petra': [35.4, 30.3],
  'Wadi Rum': [36.6, 29.6],
  'Kenya': [37.9, 0.0], 'Nairobi': [36.8, -1.3], 'Mombasa': [39.7, -4.1],
  'Maasai Mara': [35.1, -1.5], 'Masai Mara': [35.1, -1.5],
  'South Africa': [25.1, -29.0], 'Cape Town': [18.4, -33.9], 'Johannesburg': [28.0, -26.2],
  'Durban': [31.0, -29.9], 'Kruger': [31.5, -24.0], 'Garden Route': [22.0, -34.0],
  'Ethiopia': [40.5, 9.1], 'Addis Ababa': [38.7, 9.0],
  'Ghana': [-1.0, 7.9], 'Accra': [-0.2, 5.6],
  'Senegal': [-14.5, 14.5], 'Dakar': [-17.4, 14.7],
  'Namibia': [18.5, -22.0], 'Windhoek': [17.1, -22.6],
  'Mozambique': [35.5, -18.7], 'Maputo': [32.6, -25.9],
  'Israel': [34.9, 31.5], 'Jerusalem': [35.2, 31.8], 'Tel Aviv': [34.8, 32.1],
  'UAE': [55.3, 25.2], 'Dubai': [55.3, 25.2], 'Abu Dhabi': [54.4, 24.5],
  'Oman': [57.6, 21.5], 'Muscat': [58.6, 23.6],
  'Saudi Arabia': [45.1, 23.9], 'Riyadh': [46.7, 24.7],

  // South Asia
  'India': [78.9, 20.6], 'New Delhi': [77.2, 28.6], 'Delhi': [77.2, 28.6],
  'Mumbai': [72.9, 19.1], 'Goa': [74.0, 15.3], 'Varanasi': [83.0, 25.3],
  'Jaipur': [75.8, 26.9], 'Rishikesh': [78.3, 30.1], 'Agra': [78.0, 27.2],
  'Udaipur': [73.7, 24.6], 'Kolkata': [88.4, 22.6], 'Chennai': [80.3, 13.1],
  'Hampi': [76.5, 15.3], 'Leh': [77.6, 34.2], 'Ladakh': [77.6, 34.2],
  'Kannauj': [79.9, 27.1], 'Kerala': [76.3, 10.9], 'Kochi': [76.3, 9.9],
  'Sri Lanka': [80.8, 7.9], 'Colombo': [79.9, 6.9], 'Sigiriya': [80.8, 7.9],
  'Nepal': [84.1, 28.4], 'Kathmandu': [85.3, 27.7], 'Pokhara': [83.9, 28.2],

  // Southeast Asia
  'Thailand': [100.9, 15.9], 'Bangkok': [100.5, 13.8], 'Chiang Mai': [98.9, 18.8],
  'Chiang Rai': [99.8, 19.9], 'Koh Tao': [100.0, 10.1], 'Koh Phangan': [100.0, 9.7],
  'Koh Samui': [100.1, 9.5], 'Phuket': [98.3, 7.9], 'Krabi': [98.9, 8.1],
  'Pai': [98.4, 19.4], 'Ayutthaya': [100.6, 14.4],
  'Indonesia': [113.9, -0.8], 'Bali': [115.2, -8.4], 'Ubud': [115.3, -8.5],
  'Seminyak': [115.2, -8.7], 'Komodo': [119.5, -8.5], 'Raja Ampat': [130.5, -0.5],
  'Lombok': [116.3, -8.6], 'Yogyakarta': [110.4, -7.8], 'Jakarta': [106.8, -6.2],
  'Flores': [120.0, -8.7], 'Gili Islands': [116.1, -8.4],
  'Malaysia': [109.7, 4.2], 'Kuala Lumpur': [101.7, 3.1], 'Langkawi': [99.7, 6.4],
  'Penang': [100.3, 5.4], 'Sipadan': [118.6, 4.1], 'Kota Kinabalu': [116.1, 5.9],
  'Singapore': [103.8, 1.4],
  'Vietnam': [108.3, 14.1], 'Hanoi': [105.8, 21.0], 'Ho Chi Minh City': [106.7, 10.8],
  'Hoi An': [108.3, 15.9], 'Da Nang': [108.2, 16.1], 'Hue': [107.6, 16.5],
  'Ha Long Bay': [107.1, 21.0], 'Halong Bay': [107.1, 21.0], 'Nha Trang': [109.2, 12.2],
  'Cambodia': [104.9, 12.6], 'Siem Reap': [103.9, 13.4], 'Phnom Penh': [104.9, 11.6],
  'Philippines': [122.9, 12.9], 'Manila': [121.0, 14.6], 'Cebu': [123.9, 10.3],
  'Palawan': [118.7, 9.8], 'El Nido': [119.4, 11.2], 'Siargao': [126.0, 9.8],
  'Myanmar': [96.0, 21.9], 'Yangon': [96.2, 16.9], 'Bagan': [94.9, 21.2],
  'Laos': [102.5, 17.9], 'Luang Prabang': [102.1, 19.9], 'Vientiane': [102.6, 17.9],

  // East Asia
  'Japan': [138.2, 36.2], 'Tokyo': [139.7, 35.7], 'Osaka': [135.5, 34.7],
  'Kyoto': [135.8, 35.0], 'Okinawa': [127.7, 26.3], 'Hiroshima': [132.5, 34.4],
  'Nara': [135.8, 34.7], 'Hokkaido': [143.0, 43.5], 'Sapporo': [141.4, 43.1],
  'South Korea': [127.8, 35.9], 'Seoul': [127.0, 37.6], 'Busan': [129.1, 35.1], 'Jeju': [126.5, 33.5],
  'China': [104.2, 35.9], 'Beijing': [116.4, 39.9], 'Shanghai': [121.5, 31.2],
  'Chengdu': [104.1, 30.7], 'Guilin': [110.3, 25.3], 'Xi\'an': [108.9, 34.3],
  'Hong Kong': [114.1, 22.3], 'Macau': [113.5, 22.2],
  'Taiwan': [120.9, 23.7], 'Taipei': [121.5, 25.0], 'Tainan': [120.2, 23.0],
  'Mongolia': [103.8, 46.9], 'Ulaanbaatar': [106.9, 47.9],

  // Europe
  'Portugal': [-8.2, 39.6], 'Lisbon': [-9.1, 38.7], 'Porto': [-8.6, 41.2], 'Algarve': [-8.2, 37.2],
  'Spain': [-3.7, 40.4], 'Barcelona': [2.2, 41.4], 'Madrid': [-3.7, 40.4],
  'Seville': [-5.9, 37.4], 'Granada': [-3.6, 37.2], 'Málaga': [-4.4, 36.7],
  'Greece': [21.8, 39.1], 'Athens': [23.7, 37.9], 'Santorini': [25.4, 36.4],
  'Mykonos': [25.3, 37.5], 'Crete': [24.8, 35.2], 'Rhodes': [28.2, 36.4],
  'Italy': [12.6, 41.9], 'Rome': [12.5, 41.9], 'Florence': [11.3, 43.8],
  'Venice': [12.3, 45.4], 'Milan': [9.2, 45.5], 'Naples': [14.3, 40.9],
  'Amalfi Coast': [14.6, 40.6], 'Sicily': [14.0, 37.6],
  'France': [2.3, 46.2], 'Paris': [2.3, 48.9], 'Nice': [7.3, 43.7],
  'Lyon': [4.8, 45.8], 'Bordeaux': [-0.6, 44.8], 'Marseille': [5.4, 43.3],
  'Germany': [10.4, 51.2], 'Berlin': [13.4, 52.5], 'Munich': [11.6, 48.1],
  'Hamburg': [10.0, 53.6], 'Frankfurt': [8.7, 50.1], 'Cologne': [6.9, 50.9],
  'Netherlands': [5.3, 52.1], 'Amsterdam': [4.9, 52.4], 'Rotterdam': [4.5, 51.9],
  'Belgium': [4.5, 50.5], 'Brussels': [4.4, 50.8], 'Bruges': [3.2, 51.2],
  'Switzerland': [8.2, 46.8], 'Zurich': [8.5, 47.4], 'Geneva': [6.1, 46.2],
  'Interlaken': [7.9, 46.7], 'Zermatt': [7.7, 46.0],
  'Austria': [14.5, 47.5], 'Vienna': [16.4, 48.2], 'Salzburg': [13.1, 47.8], 'Innsbruck': [11.4, 47.3],
  'Croatia': [15.2, 45.1], 'Dubrovnik': [18.1, 42.6], 'Split': [16.4, 43.5], 'Zagreb': [16.0, 45.8],
  'Slovenia': [14.5, 46.2], 'Ljubljana': [14.5, 46.1],
  'Czech Republic': [15.5, 49.8], 'Prague': [14.4, 50.1],
  'Hungary': [19.5, 47.2], 'Budapest': [19.0, 47.5],
  'Poland': [19.1, 52.0], 'Warsaw': [21.0, 52.2], 'Krakow': [19.9, 50.1],
  'Turkey': [35.2, 38.9], 'Istanbul': [29.0, 41.0], 'Cappadocia': [34.8, 38.7],
  'Antalya': [30.7, 36.9], 'Bodrum': [27.4, 37.0], 'Ephesus': [27.3, 37.9],
  'United Kingdom': [-3.4, 55.4], 'UK': [-3.4, 55.4],
  'London': [-0.1, 51.5], 'Edinburgh': [-3.2, 55.9], 'Manchester': [-2.2, 53.5],
  'Ireland': [-8.2, 53.2], 'Dublin': [-6.3, 53.3], 'Galway': [-9.1, 53.3],
  'Sweden': [18.6, 63.0], 'Stockholm': [18.1, 59.3], 'Gothenburg': [12.0, 57.7],
  'Norway': [15.5, 68.0], 'Oslo': [10.8, 59.9], 'Bergen': [5.3, 60.4], 'Tromsø': [18.9, 69.7],
  'Denmark': [10.0, 56.0], 'Copenhagen': [12.6, 55.7],
  'Finland': [26.0, 65.0], 'Helsinki': [25.0, 60.2],
  'Iceland': [-19.0, 65.0], 'Reykjavik': [-22.0, 64.1],

  // South America
  'Peru': [-76.0, -9.2], 'Lima': [-77.0, -12.0], 'Cusco': [-72.0, -13.5],

  // Oceania
  'Australia': [133.8, -25.3], 'Sydney': [151.2, -33.9], 'Melbourne': [144.9, -37.8],
  'Cairns': [145.8, -16.9], 'Alice Springs': [133.9, -23.7], 'Darwin': [130.8, -12.5],
  'Broome': [122.2, -17.9], 'New Zealand': [174.9, -40.9], 'Auckland': [174.8, -36.9],
  'Fiji': [178.0, -17.7], 'Suva': [178.4, -18.1],

  // Pacific
  'Maldives': [73.2, 3.2], 'Male': [73.5, 4.2],

  // Common departure / home cities
  'London': [-0.1, 51.5], 'Manchester': [-2.2, 53.5], 'Edinburgh': [-3.2, 55.9],
  'New York': [-74.0, 40.7], 'NYC': [-74.0, 40.7], 'Los Angeles': [-118.2, 34.1], 'LA': [-118.2, 34.1],
  'Chicago': [-87.6, 41.9], 'San Francisco': [-122.4, 37.8], 'Miami': [-80.2, 25.8],
  'Toronto': [-79.4, 43.7], 'Vancouver': [-123.1, 49.3], 'Montreal': [-73.6, 45.5],
  'Singapore': [103.8, 1.4], 'Dubai': [55.3, 25.2], 'Abu Dhabi': [54.4, 24.5],
  'Hong Kong': [114.1, 22.3], 'Seoul': [127.0, 37.6], 'Beijing': [116.4, 39.9],
  'Shanghai': [121.5, 31.2], 'Taipei': [121.5, 25.0],
  'Amsterdam': [4.9, 52.4], 'Berlin': [13.4, 52.5], 'Frankfurt': [8.7, 50.1],
  'Munich': [11.6, 48.1], 'Zurich': [8.5, 47.4], 'Geneva': [6.1, 46.2],
  'Brussels': [4.4, 50.8], 'Vienna': [16.4, 48.2], 'Copenhagen': [12.6, 55.7],
  'Stockholm': [18.1, 59.3], 'Oslo': [10.8, 59.9], 'Helsinki': [25.0, 60.2],
  'Dublin': [-6.3, 53.3], 'Warsaw': [21.0, 52.2], 'Prague': [14.4, 50.1],
  'Budapest': [19.0, 47.5], 'Bucharest': [26.1, 44.4],
  'Istanbul': [29.0, 41.0], 'Tel Aviv': [34.8, 32.1], 'Riyadh': [46.7, 24.7],
  'Johannesburg': [28.0, -26.2], 'Cape Town': [18.4, -33.9], 'Nairobi': [36.8, -1.3],
  'Lagos': [3.4, 6.5], 'Accra': [-0.2, 5.6],
  'Buenos Aires': [-58.4, -34.6], 'Santiago': [-70.7, -33.5], 'São Paulo': [-46.6, -23.5],
  'Rio de Janeiro': [-43.2, -22.9], 'Bogotá': [-74.1, 4.7],
  'Brisbane': [153.0, -27.5], 'Perth': [115.9, -31.9], 'Honolulu': [-157.8, 21.3],
};

export default CITY_COORDS;
