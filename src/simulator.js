import React, { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Play, Pause, RotateCcw } from "lucide-react";

const GRAIN_PROFILES = {
  basmati_rice: {
    name: "Basmati Rice",
    starch: 78,
    protein: 7,
    amylose: 22,
    amylopectin: 78,
    initial_moisture: 12,
    target_moisture: 65,
    gelatinization_onset: 65.9,
    gelatinization_temp: 68,
    optimal_cook_time: 10,
    weight: 100,
    nir_970: 0.18,
    nir_1450: 0.22,
    nir_1680: 0.15,
    nir_1200: 0.65,
    nir_2100: 0.72,
  },
  chickpeas: {
    name: "Chickpeas",
    starch: 45,
    protein: 20,
    amylose: 30,
    amylopectin: 70,
    initial_moisture: 10,
    target_moisture: 70,
    gelatinization_onset: 72,
    gelatinization_temp: 75,
    optimal_cook_time: 20,
    weight: 100,
    nir_970: 0.15,
    nir_1450: 0.19,
    nir_1680: 0.38,
    nir_1200: 0.52,
    nir_2100: 0.68,
  },
  lentils: {
    name: "Red Lentils",
    starch: 50,
    protein: 25,
    amylose: 25,
    amylopectin: 75,
    initial_moisture: 11,
    target_moisture: 68,
    gelatinization_onset: 65,
    gelatinization_temp: 70,
    optimal_cook_time: 14,
    weight: 100,
    nir_970: 0.16,
    nir_1450: 0.2,
    nir_1680: 0.42,
    nir_1200: 0.58,
    nir_2100: 0.7,
  },
  quinoa: {
    name: "Quinoa",
    starch: 64,
    protein: 14,
    amylose: 15,
    amylopectin: 85,
    initial_moisture: 10,
    target_moisture: 62,
    gelatinization_onset: 61,
    gelatinization_temp: 65,
    optimal_cook_time: 12,
    weight: 100,
    nir_970: 0.14,
    nir_1450: 0.18,
    nir_1680: 0.28,
    nir_1200: 0.6,
    nir_2100: 0.78,
  },
};

const COOKING_PHASES = {
  MICROWAVE: "Microwave Heating",
  TRANSFER: "Transfer to Pressure Cooker",
  PRESSURE: "Pressure Cooking",
  COOLING: "Cooling/Rest",
  DONE: "Done",
};

const GrainCookingSimulator = () => {
  const [selectedGrain, setSelectedGrain] = useState("basmati_rice");
  const [grainWeight, setGrainWeight] = useState(100);
  const [speedMultiplier, setSpeedMultiplier] = useState(10);
  const [isRunning, setIsRunning] = useState(false);
  const [simTime, setSimTime] = useState(0);
  const [data, setData] = useState([]);
  const [currentPhase, setCurrentPhase] = useState(COOKING_PHASES.MICROWAVE);
  const [grainTransformation, setGrainTransformation] = useState("Hydration");
  const [decisions, setDecisions] = useState([]);
  const nirScanLoggedRef = useRef(false);
  const gelOnsetLoggedRef = useRef(false);
  const gelCompleteLoggedRef = useRef(false);
  const transferLoggedRef = useRef(false);
  const intervalRef = useRef(null);
  const decisionLogRef = useRef(null);

  const grain = GRAIN_PROFILES[selectedGrain];

  const customTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold mb-1">{`Time: ${payload[0].payload.time.toFixed(
            2
          )} min`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${
                typeof entry.value === "number"
                  ? entry.value.toFixed(2)
                  : entry.value
              }`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const calculateWaterRequired = () => {
    const waterRatios = {
      basmati_rice: 1.5,
      chickpeas: 3.0,
      lentils: 2.5,
      quinoa: 2.0,
    };

    const ratio = waterRatios[selectedGrain] || 2.0;
    return (grainWeight * ratio).toFixed(1);
  };

  const simulateCooking = (time) => {
    const cookTime = grain.optimal_cook_time * 60;
    let moisture = grain.initial_moisture;
    let temperature = 25;
    let pressure = 1;
    let ultrasonicVelocity = 1500;
    let microwavePower = 0;
    let phase = COOKING_PHASES.MICROWAVE;
    let gelatinizationProgress = 0;

    if (time === 0 && !nirScanLoggedRef.current) {
      addDecision(
        0,
        `NIR Scan Complete: 970nm=${grain.nir_970}, 1450nm=${grain.nir_1450}, 1680nm=${grain.nir_1680}, 1200nm=${grain.nir_1200}, 2100nm=${grain.nir_2100}`
      );
      addDecision(
        0,
        `Composition: Moisture ${grain.initial_moisture}%, Starch ${grain.starch}%, Protein ${grain.protein}%, Amylose ${grain.amylose}%, Amylopectin ${grain.amylopectin}%`
      );
      nirScanLoggedRef.current = true;
    }

    if (time < cookTime * 0.45) {
      phase = COOKING_PHASES.MICROWAVE;
      const microwaveProgress = time / (cookTime * 0.45);
      moisture =
        grain.initial_moisture +
        (45 - grain.initial_moisture) * microwaveProgress;
      temperature = 25 + (grain.gelatinization_temp + 15) * microwaveProgress;
      pressure = 1;
      microwavePower = 40 + 40 * microwaveProgress;
      ultrasonicVelocity = 1500 + 120 * microwaveProgress;

      if (temperature >= grain.gelatinization_onset) {
        const onsetProgress =
          (grain.gelatinization_onset - 25) /
          (grain.gelatinization_temp + 15 - 25);
        const progressSinceOnset =
          (microwaveProgress - onsetProgress) / (1 - onsetProgress);
        gelatinizationProgress = Math.max(
          0,
          Math.min(60, progressSinceOnset * 60)
        );
      } else {
        gelatinizationProgress = 0;
      }

      if (
        temperature >= grain.gelatinization_onset &&
        !gelOnsetLoggedRef.current
      ) {
        addDecision(
          time,
          `Temperature reached ${
            grain.gelatinization_onset
          }°C. Gelatinization onset detected via ultrasonic ${ultrasonicVelocity.toFixed(
            0
          )} m/s`
        );
        gelOnsetLoggedRef.current = true;
      }

      if (microwaveProgress > 0.2 && Math.floor(time) % 60 === 0) {
        addDecision(
          time,
          `Microwave at ${microwavePower.toFixed(
            0
          )}%. Core temp: ${temperature.toFixed(
            1
          )}°C, Moisture: ${moisture.toFixed(1)}%`
        );
      }
    } else if (time < cookTime * 0.48) {
      phase = COOKING_PHASES.TRANSFER;
      moisture = 45;
      temperature = grain.gelatinization_temp + 15;
      pressure = 1;
      microwavePower = 0;
      ultrasonicVelocity = 1620;
      gelatinizationProgress = 60;

      if (!transferLoggedRef.current) {
        addDecision(
          time,
          `Transferring vessel from microwave to pressure cooker chamber (~30 sec)`
        );
        transferLoggedRef.current = true;
      }
    } else if (time < cookTime * 0.85) {
      phase = COOKING_PHASES.PRESSURE;
      const pressureProgress = (time - cookTime * 0.48) / (cookTime * 0.37);
      moisture = 45 + (grain.target_moisture - 45) * pressureProgress;
      temperature =
        grain.gelatinization_temp +
        15 +
        (100 - grain.gelatinization_temp - 15) * pressureProgress;
      microwavePower = 0;
      ultrasonicVelocity = 1620 + 70 * pressureProgress;
      gelatinizationProgress = 60 + 40 * pressureProgress;

      if (pressureProgress < 0.15) {
        pressure = 1.0 + (2.2 - 1.0) * (pressureProgress / 0.15);
      } else {
        pressure = 2.2;
      }

      if (pressureProgress > 0.6 && !gelCompleteLoggedRef.current) {
        addDecision(
          time,
          `Ultrasonic: ${ultrasonicVelocity.toFixed(
            0
          )} m/s. Gelatinization complete. Grains fully softened`
        );
        gelCompleteLoggedRef.current = true;
      }

      if (pressureProgress < 0.15 && Math.floor(time) % 40 === 0) {
        addDecision(
          time,
          `Building pressure: ${pressure.toFixed(
            2
          )} atm. Ultrasonic: ${ultrasonicVelocity.toFixed(0)} m/s`
        );
      } else if (pressureProgress >= 0.15 && Math.floor(time) % 80 === 0) {
        addDecision(
          time,
          `Holding steady pressure: ${pressure.toFixed(
            1
          )} atm. Ultrasonic: ${ultrasonicVelocity.toFixed(0)} m/s`
        );
      }
    } else {
      phase =
        time < cookTime * 0.95 ? COOKING_PHASES.COOLING : COOKING_PHASES.DONE;
      const coolProgress = (time - cookTime * 0.85) / (cookTime * 0.15);
      moisture = grain.target_moisture - 2 * coolProgress;
      temperature = 100 - 35 * coolProgress;
      pressure = 2.2 - 1.2 * coolProgress;
      microwavePower = 0;
      ultrasonicVelocity = 1690 - 10 * coolProgress;
      gelatinizationProgress = 100;

      if (coolProgress < 0.3 && Math.floor(time) % 30 === 0) {
        addDecision(
          time,
          `Depressurizing: ${pressure.toFixed(
            2
          )} atm. Cooling to ${temperature.toFixed(1)}°C`
        );
      }

      if (phase === COOKING_PHASES.DONE && Math.floor(time) % 20 === 0) {
        addDecision(
          time,
          `Cooking complete. Final moisture: ${moisture.toFixed(
            1
          )}%, Ultrasonic: ${ultrasonicVelocity.toFixed(0)} m/s`
        );
      }
    }

    setCurrentPhase(phase);

    let transformation = "Hydration";
    if (gelatinizationProgress === 0) {
      transformation = "Hydration";
    } else if (gelatinizationProgress > 0 && gelatinizationProgress < 60) {
      transformation = "Gelatinization Onset";
    } else if (gelatinizationProgress >= 60 && gelatinizationProgress < 100) {
      transformation = "Complete Gelatinization";
    } else if (gelatinizationProgress === 100) {
      transformation = "Fully Cooked";
    }
    setGrainTransformation(transformation);

    return {
      time: parseFloat((time / 60).toFixed(2)),
      moisture,
      temperature,
      pressure,
      ultrasonicVelocity,
      microwavePower,
      gelatinizationProgress,
      phase,
    };
  };

  const addDecision = (time, message) => {
    setDecisions((prev) => {
      const timeKey = (time / 60).toFixed(1);
      const exists = prev.some((d) => d.time.toFixed(1) === timeKey);
      if (!exists) {
        return [...prev, { time: time / 60, message }];
      }
      return prev;
    });
  };

  useEffect(() => {
    if (decisionLogRef.current) {
      decisionLogRef.current.scrollTop = decisionLogRef.current.scrollHeight;
    }
  }, [decisions]);

  useEffect(() => {
    if (isRunning) {
      const UPDATE_INTERVAL = 100;
      const TIME_INCREMENT = (UPDATE_INTERVAL / 1000) * speedMultiplier;

      intervalRef.current = setInterval(() => {
        setSimTime((prevTime) => {
          const newTime = prevTime + TIME_INCREMENT;
          const cookTime = grain.optimal_cook_time * 60;

          if (newTime >= cookTime) {
            setIsRunning(false);
            return cookTime;
          }

          const newDataPoint = simulateCooking(newTime);
          setData((prevData) => [...prevData, newDataPoint]);

          return newTime;
        });
      }, UPDATE_INTERVAL);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, selectedGrain, speedMultiplier, grain.optimal_cook_time]);

  const handleReset = () => {
    setIsRunning(false);
    setSimTime(0);
    setData([]);
    setCurrentPhase(COOKING_PHASES.MICROWAVE);
    setGrainTransformation("Hydration");
    setDecisions([]);
    nirScanLoggedRef.current = false;
    gelOnsetLoggedRef.current = false;
    gelCompleteLoggedRef.current = false;
    transferLoggedRef.current = false;
  };

  const handleGrainChange = (e) => {
    handleReset();
    setSelectedGrain(e.target.value);
  };

  return (
    <div className="w-full h-screen bg-gray-50 p-6 overflow-auto">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Grain Cooking System Simulator
          </h1>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Grain Type
              </label>
              <select
                value={selectedGrain}
                onChange={handleGrainChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(GRAIN_PROFILES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grain Weight (g)
              </label>
              <input
                type="number"
                value={grainWeight}
                onChange={(e) =>
                  setGrainWeight(Math.max(1, parseInt(e.target.value) || 1))
                }
                min="1"
                max="1000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Simulation Speed
              </label>
              <select
                value={speedMultiplier}
                onChange={(e) => setSpeedMultiplier(parseInt(e.target.value))}
                disabled={isRunning}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value={1}>1x (real time)</option>
                <option value={2}>2x</option>
                <option value={5}>5x</option>
                <option value={10}>10x (default)</option>
                <option value={20}>20x</option>
              </select>
            </div>

            <div className="flex gap-2 items-end">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {isRunning ? <Pause size={20} /> : <Play size={20} />}
                {isRunning ? "Pause" : "Start"}
              </button>

              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                <RotateCcw size={20} />
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr] gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Cooking Stage</div>
              <div className="text-lg font-semibold text-blue-700">
                {currentPhase}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Grain Transformation</div>
              <div className="text-lg font-semibold text-purple-700">
                {grainTransformation}
              </div>
            </div>
            <div className="bg-emerald-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Cook Time</div>
              <div className="text-lg font-semibold text-emerald-700">
                {(simTime / 60).toFixed(1)} / {grain.optimal_cook_time} min
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Real Time Elapsed</div>
              <div className="text-lg font-semibold text-orange-700">
                {(simTime / 60 / speedMultiplier).toFixed(1)} min
              </div>
            </div>
            <div className="bg-cyan-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Water Required</div>
              <div className="text-lg font-semibold text-cyan-700">
                {calculateWaterRequired()} ml
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="font-semibold text-gray-700 mb-2">
              NIR Scan Results: {grain.name}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm mb-3">
              <div>
                <span className="font-medium">970nm:</span> {grain.nir_970}
              </div>
              <div>
                <span className="font-medium">1450nm:</span> {grain.nir_1450}
              </div>
              <div>
                <span className="font-medium">1680nm:</span> {grain.nir_1680}
              </div>
              <div>
                <span className="font-medium">1200nm:</span> {grain.nir_1200}
              </div>
              <div>
                <span className="font-medium">2100nm:</span> {grain.nir_2100}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm border-t pt-2">
              <div>
                <span className="font-medium">Moisture:</span>{" "}
                {grain.initial_moisture}%
              </div>
              <div>
                <span className="font-medium">Starch:</span> {grain.starch}%
              </div>
              <div>
                <span className="font-medium">Protein:</span> {grain.protein}%
              </div>
              <div>
                <span className="font-medium">Amylose:</span> {grain.amylose}%
              </div>
              <div>
                <span className="font-medium">Amylopectin:</span>{" "}
                {grain.amylopectin}%
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">
              Moisture & Temperature
            </h3>
            <ResponsiveContainer width="100%" height={275}>
              <LineChart
                data={data}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  label={{
                    value: "Time (min)",
                    position: "insideBottom",
                    offset: -15,
                  }}
                />
                <YAxis
                  yAxisId="left"
                  label={{
                    value: "Moisture (%)",
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle" },
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{
                    value: "Temp (°C)",
                    angle: 90,
                    position: "insideRight",
                    style: { textAnchor: "middle" },
                  }}
                />
                <Tooltip content={customTooltip} />
                <Legend wrapperStyle={{ paddingTop: "25px" }} />
                <ReferenceLine
                  yAxisId="left"
                  y={grain.target_moisture}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="moisture"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  name="Moisture %"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name="Temperature °C"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">
              Ultrasonic Monitoring
            </h3>
            <ResponsiveContainer width="100%" height={275}>
              <LineChart
                data={data}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  label={{
                    value: "Time (min)",
                    position: "insideBottom",
                    offset: -15,
                  }}
                />
                <YAxis
                  label={{
                    value: "Sound Velocity (m/s)",
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle" },
                  }}
                  domain={[1450, 1750]}
                />
                <Tooltip content={customTooltip} />
                <Legend wrapperStyle={{ paddingTop: "25px" }} />
                <Line
                  type="monotone"
                  dataKey="ultrasonicVelocity"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  name="Ultrasonic Velocity"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">
              Process Control
            </h3>
            <ResponsiveContainer width="100%" height={275}>
              <LineChart
                data={data}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  label={{
                    value: "Time (min)",
                    position: "insideBottom",
                    offset: -15,
                  }}
                />
                <YAxis
                  yAxisId="left"
                  label={{
                    value: "Pressure (atm)",
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle" },
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{
                    value: "Microwave Power (%)",
                    angle: 90,
                    position: "insideRight",
                    style: { textAnchor: "middle" },
                  }}
                />
                <Tooltip content={customTooltip} />
                <Legend wrapperStyle={{ paddingTop: "25px" }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="pressure"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Pressure (atm)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="microwavePower"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  name="Microwave Power %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">
              Gelatinization Progress
            </h3>
            <ResponsiveContainer width="100%" height={275}>
              <LineChart
                data={data}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  label={{
                    value: "Time (min)",
                    position: "insideBottom",
                    offset: -15,
                  }}
                />
                <YAxis
                  label={{
                    value: "Progress (%)",
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle" },
                  }}
                  domain={[0, 100]}
                />
                <Tooltip content={customTooltip} />
                <Legend wrapperStyle={{ paddingTop: "25px" }} />
                <ReferenceLine y={100} stroke="#10b981" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="gelatinizationProgress"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={false}
                  name="Gelatinization %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="font-semibold text-gray-800 mb-3">Decision Log</h3>
          <div
            ref={decisionLogRef}
            className="max-h-64 overflow-y-auto space-y-2"
          >
            {decisions.length === 0 ? (
              <p className="text-gray-500 italic">
                Start simulation to see decisions...
              </p>
            ) : (
              decisions.map((decision, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 text-sm border-l-4 border-blue-500 pl-3 py-2 bg-blue-50"
                >
                  <span className="font-semibold text-blue-700 min-w-[60px]">
                    {decision.time.toFixed(1)} min:
                  </span>
                  <span className="text-gray-700">{decision.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrainCookingSimulator;
