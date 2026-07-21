#!/usr/bin/env node
/**
 * CourtTrack Schedule Uploader
 * 
 * Reads a JSON schedule file and uploads it to Firebase (ct/schedule)
 * 
 * Usage: node upload-schedule.js [schedule-file.json]
 * Default: schedule-35plus.json
 */

const fs = require('fs');
const path = require('path');

// Firebase SDK
const admin = require('firebase-admin');

// Get filename from args or use default
const scheduleFile = process.argv[2] || 'schedule-35plus.json';

if (!fs.existsSync(scheduleFile)) {
  console.error(`❌ File not found: ${scheduleFile}`);
  console.error('Usage: node upload-schedule.js [schedule-file.json]');
  process.exit(1);
}

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  CourtTrack Schedule Uploader                          ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

try {
  // Read JSON file
  const scheduleData = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'));
  console.log(`✓ Loaded: ${scheduleFile}`);
  
  // Parse schedule structure
  const divisions = Object.keys(scheduleData);
  console.log(`✓ Found divisions: ${divisions.join(', ')}\n`);

  // Initialize Firebase (uses GOOGLE_APPLICATION_CREDENTIALS env var)
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        databaseURL: 'https://court-track-39271-default-rtdb.firebaseio.com'
      });
      console.log('✓ Firebase initialized\n');
    } catch (err) {
      console.error('⚠ Firebase init warning:', err.message);
      console.error('Make sure GOOGLE_APPLICATION_CREDENTIALS is set or firebase config exists\n');
    }
  }

  const db = admin.database();

  // Upload each division's schedule
  async function uploadSchedules() {
    for (const division of divisions) {
      const divisionData = scheduleData[division];
      const divisionKey = division.toLowerCase();
      
      console.log(`📤 Uploading ${division} schedule...`);
      
      // Write to ct/schedule/{division}
      await db.ref(`ct/schedule/${divisionKey}`).set(divisionData);
      
      console.log(`   ✓ Uploaded ${divisionData.weeks.length} weeks`);
      console.log(`   → Path: ct/schedule/${divisionKey}\n`);
    }

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  Upload Complete ✓                                    ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Show summary
    console.log('Summary:');
    for (const division of divisions) {
      const divisionData = scheduleData[division];
      console.log(`  ${division}:`);
      console.log(`    - Weeks: ${divisionData.weeks.length}`);
      console.log(`    - Season: ${divisionData.season}`);
      console.log(`    - Firebase path: ct/schedule/${division.toLowerCase()}`);
    }

    console.log('\n✓ Schedule updated in Firebase!');
    console.log('⚠ CourtTrack will sync automatically on next refresh.\n');

    process.exit(0);
  }

  uploadSchedules().catch((err) => {
    console.error('❌ Upload failed:', err.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Verify GOOGLE_APPLICATION_CREDENTIALS env var is set');
    console.error('  2. Check Firebase database URL in code');
    console.error('  3. Ensure JSON file is valid');
    process.exit(1);
  });

} catch (err) {
  console.error('❌ Error:', err.message);
  console.error('\nMake sure:');
  console.error('  1. File is valid JSON');
  console.error('  2. File path is correct');
  console.error('  3. firebase-admin is installed: npm install firebase-admin');
  process.exit(1);
}
