import 'dotenv/config';
import { flightTracker, Flight, FlightAlert } from './sources/flights';

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

async function monitorFlights(region: 'middle_east' | 'europe' | 'usa' | 'asia' = 'middle_east') {
  printStatus(`Fetching flights for ${region.toUpperCase()}...`);
  
  const flights = await flightTracker.getRegion(region);
  
  if (flights.length === 0) {
    printStatus('No flights received (API may be rate limited, retrying in 30s...)');
    return;
  }

  // Analyze for alerts
  const alerts = flightTracker.analyze(flights);
  
  // Print alerts first
  alerts.forEach(printAlert);

  // Filter military flights
  const militaryFlights = flights.filter(f => flightTracker.isMilitary(f));
  const emergencyFlights = flights.filter(f => flightTracker.isEmergency(f));

  console.log(`\n📡 LIVE FLIGHT DATA — ${region.toUpperCase()}`);
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

  // Show some regular high-altitude traffic
  const highAltitude = flights
    .filter(f => f.altitude > 30000 && !flightTracker.isMilitary(f))
    .slice(0, 5);
  
  if (highAltitude.length > 0) {
    console.log('\n✈️  HIGH ALTITUDE TRAFFIC (sample):');
    highAltitude.forEach(f => printFlight(f));
  }

  console.log('\n' + '─'.repeat(60));
  printStatus(`Next update in 30 seconds...`);
}

async function main() {
  printHeader();
  console.log('🦀 Initializing Clawdwatch...\n');

  // Get region from env or default to middle_east
  const region = (process.env.WATCH_REGION || 'middle_east') as 'middle_east' | 'europe' | 'usa' | 'asia';
  
  printStatus(`Monitoring region: ${region.toUpperCase()}`);
  printStatus('Connecting to OpenSky Network...');
  
  // Initial fetch
  await monitorFlights(region);

  // Update every 30 seconds (OpenSky rate limit is ~10 requests per minute for anonymous)
  setInterval(() => {
    monitorFlights(region);
  }, 30000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🦀 Clawdwatch shutting down...');
  process.exit(0);
});

main().catch(console.error);
