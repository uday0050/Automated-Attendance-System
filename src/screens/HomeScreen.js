import React, { useState, useEffect, useLayoutEffect } from 'react';
import { StyleSheet, Text, View, Image, SafeAreaView } from 'react-native';
import Carousel from 'react-native-snap-carousel';
import Firebase from 'firebase';
import { AsyncStorage } from 'react-native';

export default function HomeScreen(props) {
  const [user] = useState(global.user);
  const [database, setDatabase] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const firebaseConfig = {
    apiKey: '<your-api-key>',
    authDomain: '<your-project-id>.firebaseapp.com',
    databaseURL: 'https://<your-project-id>-default-rtdb.firebaseio.com',
    projectId: '<your-project-id>',
    storageBucket: '<your-project-id>.appspot.com',
    messagingSenderId: '<your-messaging-sender-id>',
    appId: '<your-app-id>',
    measurementId: '<your-measurement-id>',
  };

  if (!Firebase.apps.length) {
    Firebase.initializeApp(firebaseConfig);
  }

  useLayoutEffect(() => {
    updateDatabase();
  }, []);

  function updateDatabase() {
    Firebase.database()
      .ref('/users/' + user)
      .on('value', (snapshot) => {
        const db = snapshot.val();
        setDatabase(db);
      });
  }

  // Build carousel items from attendance data
  function buildCarouselItems(db) {
    if (!db || !db.attendance) return [];
    const carouselList = [];
    const subjectKeys = Object.keys(db.attendance);
    for (let i = 0; i < subjectKeys.length; i++) {
      const subjectId = subjectKeys[i];
      const dayValues = Object.values(db.attendance[subjectId]).join('');
      const attended = (dayValues.match(/1/g) || []).length;
      const total = dayValues.length;
      const perc = total > 0 ? Math.round((attended / total) * 100) : 0;
      // Classes needed to reach 75% threshold
      const classesNeeded = Math.max(0, Math.ceil((17 * total - 20 * attended) / 3));
      const subjectName = db.subjects ? db.subjects[subjectId] : subjectId;

      carouselList.push({
        title: subjectName || subjectId,
        text: classesNeeded === 0
          ? `${perc}% — Attendance satisfactory`
          : `${perc}% — Need ${classesNeeded} more class${classesNeeded !== 1 ? 'es' : ''}`,
        perc,
      });
    }
    return carouselList;
  }

  function getOverallStatus(carouselItems) {
    if (carouselItems.length === 0) return { label: '—', color: '#9E9E9E' };
    const minPerc = Math.min(...carouselItems.map((c) => c.perc));
    if (minPerc >= 85) return { label: 'EXCELLENT', color: '#A5D6A7' };
    if (minPerc >= 75) return { label: 'GOOD', color: '#FFE082' };
    return { label: 'LOW', color: '#EF9A9A' };
  }

  function renderCard({ item }) {
    const isLow = item.perc < 75;
    return (
      <View style={[styles.card, isLow && styles.cardLow]}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={[styles.cardPerc, { color: isLow ? '#C62828' : '#2E7D32' }]}>
          {item.perc}%
        </Text>
        <Text style={styles.cardText}>{item.text.split('—')[1]?.trim() || item.text}</Text>
      </View>
    );
  }

  if (!database) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const carouselItems = buildCarouselItems(database);
  const overallStatus = getOverallStatus(carouselItems);

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <View style={styles.topContent}>
          <View style={styles.topLeft}>
            <Text style={styles.welcomeText}>
              Welcome,{'\n'}
              {database.name ? database.name.split(' ')[0] : ''}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: overallStatus.color }]}>
              <Text style={styles.statusBadgeText}>
                Attendance {overallStatus.label}
              </Text>
            </View>
          </View>

          <View style={styles.profilePicBorder}>
            <Image
              source={{ uri: database.profilePic }}
              style={styles.profilePic}
            />
          </View>
        </View>

        {/* GPS check-in indicator */}
        <View style={styles.gpsBadge}>
          <Text style={styles.gpsBadgeText}>📍 GPS Check-In Available</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.carouselLabel}>Subject Overview</Text>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center' }}>
            {carouselItems.length > 0 ? (
              <Carousel
                layout="default"
                data={carouselItems}
                sliderWidth={300}
                itemWidth={280}
                renderItem={renderCard}
              />
            ) : (
              <Text style={styles.noData}>No attendance data yet.</Text>
            )}
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    color: '#00796B',
    fontSize: 16,
  },
  top: {
    flex: 1,
    backgroundColor: '#00796B',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  topContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  topLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#212121',
    fontWeight: '700',
    fontSize: 13,
  },
  profilePicBorder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'white',
    overflow: 'hidden',
    marginLeft: 16,
  },
  profilePic: {
    width: 64,
    height: 64,
  },
  gpsBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  gpsBadgeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
  },
  bottom: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: 16,
  },
  carouselLabel: {
    textAlign: 'center',
    color: '#424242',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#B2DFDB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardLow: {
    borderColor: '#FFCDD2',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#212121',
    marginBottom: 12,
    width: '100%',
  },
  cardPerc: {
    fontSize: 42,
    fontWeight: 'bold',
  },
  cardText: {
    marginTop: 8,
    color: '#616161',
    fontSize: 14,
    textAlign: 'center',
  },
  noData: {
    color: '#9E9E9E',
    fontSize: 15,
    alignSelf: 'center',
    marginTop: 60,
  },
});
