export interface TcxSample {
  t: string         // ISO timestamp
  distM: number
  power: number
  cad: number
  speedMs: number
  hr?: number | null
}

export interface RideStats {
  startTime: Date
  elapsedSeconds: number
  distanceMeters: number
  avgPower: number
  maxPower: number
  avgHr?: number
  maxHr?: number
  energyKj: number
}

export function buildTcx(samples: TcxSample[], stats: RideStats): string {
  const start = samples[0]?.t ?? stats.startTime.toISOString()
  const pts = samples.map(s => `
      <Trackpoint>
        <Time>${s.t}</Time>
        <DistanceMeters>${s.distM.toFixed(1)}</DistanceMeters>
        <Cadence>${s.cad}</Cadence>${s.hr ? `
        <HeartRateBpm><Value>${s.hr}</Value></HeartRateBpm>` : ''}
        <Extensions>
          <ns3:TPX>
            <ns3:Speed>${s.speedMs.toFixed(2)}</ns3:Speed>
            <ns3:Watts>${s.power}</ns3:Watts>
          </ns3:TPX>
        </Extensions>
      </Trackpoint>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
  <Activities>
    <Activity Sport="Biking">
      <Id>${start}</Id>
      <Lap StartTime="${start}">
        <TotalTimeSeconds>${stats.elapsedSeconds}</TotalTimeSeconds>
        <DistanceMeters>${stats.distanceMeters.toFixed(1)}</DistanceMeters>
        <Calories>${Math.round(stats.energyKj * 0.239)}</Calories>
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
        <Track>${pts}
        </Track>
        <Extensions>
          <ns3:LX>
            <ns3:AvgWatts>${Math.round(stats.avgPower)}</ns3:AvgWatts>
            <ns3:MaxWatts>${Math.round(stats.maxPower)}</ns3:MaxWatts>
          </ns3:LX>
        </Extensions>
      </Lap>
      <Notes>VectorVelo arcade trainer ride</Notes>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`
}
