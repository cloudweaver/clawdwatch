import 'dotenv/config';
import { flightTracker, Flight, FlightAlert } from './sources/flights';
import { telegramAlerter } from './alerts/telegram';
import { newsAggregator, NewsItem } from './sources/news';
import { socialMonitor, SocialPost } from './sources/social';
import { satelliteTracker } from './sources/satellite';
import { shipTracker } from './sources/ships';
import { internetMonitor } from './sources/internet';
import { runCli, shouldSendShutdownNotice } from './cli';

/**
 * 🦀 CLAWDWATCH
 * The all-seeing OSINT agent
 */

const LOGO = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     ██████╗██╗      █████╗ ██╗    ██╗██████╗              ║
║    ██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗             ║
║    ██║     ██║     ███████║██║ █╗ ██║██║  ██║             ║
║    ██║     ██║     ██╔══██║██║███╗██║██║  ██║             ║
║    ╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝             ║
║     ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝              ║
║                    WATCH                                   ║
║                                                           ║
║        🦀 The All-Seeing OSINT Agent 🦀                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`;

function printHeader() {
  console.clear();
  console.log(LOGO);
}

function printStatus(message: string) {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] ${message}`);
}

function printFlight(flight: Flight, isMilitary: boolean = false) {
  const icon = isMilitary ? '🎖️ ' : '✈️ ';
  const alt = Math.round(flight.altitude).toLocaleString();
  const spd = String(Math.round(flight.speed));
  console.log(`  ${icon} ${flight.callsign.padEnd(10)} | ${alt.padStart(7)}ft | ${spd.padStart(4)}kts | ${flight.origin || 'N/A'}`);
}

function printAlert(alert: FlightAlert) {
  const time = alert.timestamp.toLocaleTimeString();
  const icon = alert.type === 'emergency' ? '🚨' : alert.type === 'military' ? '🎖️ ' : '⚠️ ';
  console.log(`\n${icon} [${time}] ALERT: ${alert.message}`);
}

function printNews(item: NewsItem) {
  console.log(`  📰 [${item.source}] ${item.title.slice(0, 70)}...`);
}

function printSocial(post: SocialPost) {
  const icon = post.platform === 'twitter' ? '🐦' : '🔗';
  console.log(`  ${icon} ${post.text.slice(0, 70)}...`);
}

let region: 'middle_east' | 'europe' | 'usa' | 'asia' = 'middle_east';

async function monitorFlights() {
  printStatus(`Fetching flights for ${region.toUpperCase()}...`);
  
  const flights = await flightTracker.getRegion(region);
  
  if (flights.length === 0) {
    printStatus('No flights received (API may be rate limited)');
    return { total: 0, military: 0, emergency: 0 };
  }

  // Analyze for alerts
  const alerts = flightTracker.analyze(flights);
  
  // Print and send alerts
  for (const alert of alerts) {
    printAlert(alert);
    if (telegramAlerter.isEnabled()) {
      await telegramAlerter.sendFlightAlert(alert);
    }
  }

  // Filter military flights
  const militaryFlights = flights.filter(f => flightTracker.isMilitary(f));
  const emergencyFlights = flights.filter(f => flightTracker.isEmergency(f));

  console.log(`\n📡 FLIGHT DATA — ${region.toUpperCase()}`);
  console.log('─'.repeat(60));
  console.log(`  Total: ${flights.length} | Military: ${militaryFlights.length} | Emergency: ${emergencyFlights.length}`);
  console.log('─'.repeat(60));

  // Show military flights
  if (militaryFlights.length > 0) {
    console.log('\n🎖️  MILITARY AIRCRAFT:');
    militaryFlights.slice(0, 10).forEach(f => printFlight(f, true));
  }

  // Show emergency flights
  if (emergencyFlights.length > 0) {
    console.log('\n🚨 EMERGENCY SQUAWKS:');
    emergencyFlights.forEach(f => printFlight(f));
  }

  // Show active flights
  const activeFlights = flights
    .filter(f => f.altitude > 10000 && !flightTracker.isMilitary(f) && f.speed > 200)
    .sort((a, b) => b.altitude - a.altitude)
    .slice(0, 5);
  
  if (activeFlights.length > 0) {
    console.log('\n✈️  ACTIVE FLIGHTS:');
    activeFlights.forEach(f => printFlight(f));
  }

  return { total: flights.length, military: militaryFlights.length, emergency: emergencyFlights.length };
}

async function monitorNews() {
  printStatus('Fetching news...');
  
  const news = await newsAggregator.fetchAll();
  
  if (news.length > 0) {
    console.log('\n📰 LATEST NEWS:');
    console.log('─'.repeat(60));
    news.slice(0, 5).forEach(printNews);
  }

  return news.length;
}

async function monitorSocial() {
  const posts = await socialMonitor.fetchAll();
  
  if (posts.length > 0) {
    console.log('\n🌐 SOCIAL INTEL:');
    console.log('─'.repeat(60));
    posts.slice(0, 3).forEach(printSocial);
  }

  return posts.length;
}

async function monitorInternet() {
  printStatus('Checking internet connectivity...');
  
  const statusLines = await internetMonitor.getStatus();
  
  console.log('\n🌍 INTERNET CONNECTIVITY:');
  console.log('─'.repeat(60));
  statusLines.forEach(line => console.log(`  ${line}`));
  
  return statusLines.length;
}

async function runMonitor() {
  const flightStats = await monitorFlights();
  const newsCount = await monitorNews();
  const socialCount = await monitorSocial();
  await monitorInternet();

  console.log('\n' + '═'.repeat(60));
  console.log(`📊 SUMMARY: ${flightStats.total} flights | ${newsCount} news | ${socialCount} social`);
  
  if (shouldSendShutdownNotice() && telegramAlerter.isEnabled()) {
    console.log(`📱 Telegram: ✅ Connected`);
  }
  if (satelliteTracker.isEnabled()) {
    console.log(`🛰️  Satellite: ✅ Connected`);
  }
  if (socialMonitor.isEnabled()) {
    console.log(`🐦 Twitter: ✅ Connected`);
  }
  
  console.log('═'.repeat(60));
  printStatus(`Next update in 60 seconds...`);
}

async function main() {
  printHeader();
  console.log('🦀 Initializing Clawdwatch...\n');

  // Get region from env or default to middle_east
  region = (process.env.WATCH_REGION || 'middle_east') as typeof region;
  
  printStatus(`Monitoring region: ${region.toUpperCase()}`);
  
  // Status checks
  printStatus(`Flights: ✅ OpenSky Network`);
  printStatus(`News: ✅ Reuters, Al Jazeera, AP`);
  printStatus(`Social: ${socialMonitor.isEnabled() ? '✅ Twitter API' : '⚠️  Reddit only (set TWITTER_BEARER_TOKEN for full access)'}`);
  printStatus(`Satellite: ${satelliteTracker.isEnabled() ? '✅ Sentinel Hub' : '❌ Not configured (set SENTINEL_HUB credentials)'}`);
  printStatus(`Telegram: ${telegramAlerter.isEnabled() ? '✅ Alerts enabled' : '❌ Not configured'}`);
  
  console.log('');

  // Startup notification
  if (shouldSendShutdownNotice() && telegramAlerter.isEnabled()) {
    await telegramAlerter.sendStartup(region);
  }
  
  // Initial run
  await runMonitor();

  // Update every 60 seconds
  setInterval(() => {
    runMonitor();
  }, 60000);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🦀 Clawdwatch shutting down...');
  if (shouldSendShutdownNotice() && telegramAlerter.isEnabled()) {
    await telegramAlerter.send('🦀 Clawdwatch going offline.');
  }
  process.exit(0);
});

runCli().catch((error) => {
  console.error(error);
  process.exit(1);
});
