import { useMemo, useState } from 'react';
import { calculateCarbonFootprint } from '../lib/ecogenLogic';
import type { CarbonInput, UserRole } from '../types/ecogen';

interface CarbonCalculatorViewProps {
  activeRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onSaveCalculation: (input: CarbonInput) => Promise<{ ok: boolean; error?: string }>;
}

const DEFAULT_INPUT: CarbonInput = {
  weeklyCarKm: 90,
  vehicleType: 'petrol',
  weeklyTransitKm: 25,
  annualShortFlights: 2,
  annualLongFlights: 0,
  monthlyElectricityKwh: 260,
  gridRegion: 'global',
  renewableTariffPct: 15,
  dietType: 'omnivore',
  foodWasteHabit: 'average',
  monthlyGoodsSpendUsd: 200,
  compostingAndRecycling: false,
};

export function CarbonCalculatorView({
  activeRole,
  onSelectRole,
  onSaveCalculation,
}: CarbonCalculatorViewProps) {
  const [input, setInput] = useState<CarbonInput>(DEFAULT_INPUT);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const result = useMemo(() => calculateCarbonFootprint(input), [input]);

  const categories = [
    { label: 'Transport', kg: result.breakdown.transportKg, color: '#0F2E1E' },
    { label: 'Electricity', kg: result.breakdown.electricityKg, color: '#15803D' },
    { label: 'Food Habits', kg: result.breakdown.foodKg, color: '#65A30D' },
    { label: 'Lifestyle & Goods', kg: result.breakdown.lifestyleKg, color: '#94A3B8' },
  ];

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    const res = await onSaveCalculation(input);
    setSaving(false);
    if (res.ok) {
      setFeedback({
        type: 'success',
        text: `Saved ${result.totalTonnesCo2e} tCO2e/yr estimate to your Dashboard history.`,
      });
    } else {
      setFeedback({
        type: 'error',
        text: res.error || 'Unable to save carbon estimate.',
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-[#DDE3DD] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#15803D]">
            Transparent Lifecycle Methodology · DEFRA 2024 / EPA / IPCC AR6
          </p>
          <h1 className="text-3xl font-bold text-[#0F2E1E] mt-1">
            Carbon Footprint Calculator
          </h1>
          <p className="text-sm text-[#4B5E53] mt-1 max-w-2xl">
            Estimate annual greenhouse gas impact across transport, electricity, diet, and lifestyle.
            Results are documented planning estimates—never presented as certified laboratory measurements.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setInput(DEFAULT_INPUT)}
          className="px-4 py-2 border border-[#DDE3DD] bg-white text-xs font-semibold text-[#0F2E1E] rounded-lg hover:bg-[#F8F7F2] self-start cursor-pointer"
        >
          Reset Defaults
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: 4 Input Modules */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Transport */}
          <section className="bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#0F2E1E]">01. Transport &amp; Aviation</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="calc-vehicle-type" className="block text-xs font-medium text-[#394B40] mb-1">
                  Primary Car Fuel Type
                </label>
                <select
                  id="calc-vehicle-type"
                  value={input.vehicleType}
                  onChange={(e) =>
                    setInput((prev) => ({
                      ...prev,
                      vehicleType: e.target.value as CarbonInput['vehicleType'],
                    }))
                  }
                  className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="petrol">Petrol (0.171 kgCO2e/km)</option>
                  <option value="diesel">Diesel (0.168 kgCO2e/km)</option>
                  <option value="hybrid">Hybrid (0.118 kgCO2e/km)</option>
                  <option value="electric">Electric (0.047 kgCO2e/km)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-[#394B40] mb-1">
                  <label htmlFor="calc-car-km">Weekly Car Distance</label>
                  <span className="font-mono tabular-nums">{input.weeklyCarKm} km</span>
                </div>
                <input
                  id="calc-car-km"
                  type="range"
                  min={0}
                  max={600}
                  step={10}
                  value={input.weeklyCarKm}
                  onChange={(e) =>
                    setInput((prev) => ({ ...prev, weeklyCarKm: Number(e.target.value) }))
                  }
                  className="w-full accent-[#15803D]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-[#394B40] mb-1">
                  <label htmlFor="calc-transit-km">Weekly Public Transit</label>
                  <span className="font-mono tabular-nums">{input.weeklyTransitKm} km</span>
                </div>
                <input
                  id="calc-transit-km"
                  type="range"
                  min={0}
                  max={300}
                  step={5}
                  value={input.weeklyTransitKm}
                  onChange={(e) =>
                    setInput((prev) => ({ ...prev, weeklyTransitKm: Number(e.target.value) }))
                  }
                  className="w-full accent-[#15803D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="calc-short-flights" className="block text-xs font-medium text-[#394B40] mb-1">
                    Short Flights/yr
                  </label>
                  <input
                    id="calc-short-flights"
                    type="number"
                    min={0}
                    max={40}
                    value={input.annualShortFlights}
                    onChange={(e) =>
                      setInput((prev) => ({
                        ...prev,
                        annualShortFlights: Math.max(0, Number(e.target.value)),
                      }))
                    }
                    className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="calc-long-flights" className="block text-xs font-medium text-[#394B40] mb-1">
                    Long Flights/yr
                  </label>
                  <input
                    id="calc-long-flights"
                    type="number"
                    min={0}
                    max={20}
                    value={input.annualLongFlights}
                    onChange={(e) =>
                      setInput((prev) => ({
                        ...prev,
                        annualLongFlights: Math.max(0, Number(e.target.value)),
                      }))
                    }
                    className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 2. Electricity */}
          <section className="bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#0F2E1E]">02. Household Electricity Usage</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="calc-grid-region" className="block text-xs font-medium text-[#394B40] mb-1">
                  Regional Grid Intensity
                </label>
                <select
                  id="calc-grid-region"
                  value={input.gridRegion}
                  onChange={(e) =>
                    setInput((prev) => ({
                      ...prev,
                      gridRegion: e.target.value as CarbonInput['gridRegion'],
                    }))
                  }
                  className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="global">Global Avg (475 g/kWh)</option>
                  <option value="us">US Avg (386 g/kWh)</option>
                  <option value="eu">EU Avg (230 g/kWh)</option>
                  <option value="india">India Avg (710 g/kWh)</option>
                  <option value="nordic">Nordic Hydro (45 g/kWh)</option>
                </select>
              </div>

              <div>
                <label htmlFor="calc-kwh" className="block text-xs font-medium text-[#394B40] mb-1">
                  Monthly kWh Usage
                </label>
                <input
                  id="calc-kwh"
                  type="number"
                  min={0}
                  max={3000}
                  value={input.monthlyElectricityKwh}
                  onChange={(e) =>
                    setInput((prev) => ({
                      ...prev,
                      monthlyElectricityKwh: Math.max(0, Number(e.target.value)),
                    }))
                  }
                  className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm font-mono tabular-nums"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-[#394B40] mb-1">
                  <label htmlFor="calc-renewable-pct">Renewable Tariff</label>
                  <span className="font-mono tabular-nums">{input.renewableTariffPct}%</span>
                </div>
                <input
                  id="calc-renewable-pct"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={input.renewableTariffPct}
                  onChange={(e) =>
                    setInput((prev) => ({
                      ...prev,
                      renewableTariffPct: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-[#15803D]"
                />
              </div>
            </div>
          </section>

          {/* 3. Food & 4. Lifestyle */}
          <section className="bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#0F2E1E]">03. Food Habits &amp; Lifestyle</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="calc-diet" className="block text-xs font-medium text-[#394B40] mb-1">
                  Dietary Pattern
                </label>
                <select
                  id="calc-diet"
                  value={input.dietType}
                  onChange={(e) =>
                    setInput((prev) => ({
                      ...prev,
                      dietType: e.target.value as CarbonInput['dietType'],
                    }))
                  }
                  className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="plant_based">Plant-Based (1,050 kg/yr)</option>
                  <option value="vegetarian">Vegetarian (1,390 kg/yr)</option>
                  <option value="flexitarian">Flexitarian (1,780 kg/yr)</option>
                  <option value="omnivore">Omnivore (2,350 kg/yr)</option>
                  <option value="high_meat">High-Meat (3,180 kg/yr)</option>
                </select>
              </div>

              <div>
                <label htmlFor="calc-food-waste" className="block text-xs font-medium text-[#394B40] mb-1">
                  Household Food Waste Level
                </label>
                <select
                  id="calc-food-waste"
                  value={input.foodWasteHabit}
                  onChange={(e) =>
                    setInput((prev) => ({
                      ...prev,
                      foodWasteHabit: e.target.value as CarbonInput['foodWasteHabit'],
                    }))
                  }
                  className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="low">Low (-10% multiplier)</option>
                  <option value="average">Average (1.0x)</option>
                  <option value="high">High (+18% multiplier)</option>
                </select>
              </div>

              <div>
                <label htmlFor="calc-goods-spend" className="block text-xs font-medium text-[#394B40] mb-1">
                  Monthly Consumer Goods Spend (USD)
                </label>
                <input
                  id="calc-goods-spend"
                  type="number"
                  min={0}
                  max={5000}
                  value={input.monthlyGoodsSpendUsd}
                  onChange={(e) =>
                    setInput((prev) => ({
                      ...prev,
                      monthlyGoodsSpendUsd: Math.max(0, Number(e.target.value)),
                    }))
                  }
                  className="w-full border border-[#DDE3DD] rounded-lg px-3 py-2 text-sm font-mono tabular-nums"
                />
              </div>

              <div className="flex items-end pb-2">
                <label className="inline-flex items-center gap-2.5 text-sm text-[#14231B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={input.compostingAndRecycling}
                    onChange={(e) =>
                      setInput((prev) => ({
                        ...prev,
                        compostingAndRecycling: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-[#15803D]"
                  />
                  Active Composting &amp; Material Recycling (-180 kg/yr)
                </label>
              </div>
            </div>
          </section>
        </div>

        {/* Right: Results, Breakdown, Assumptions & Recommendations */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-[#0F2E1E] text-[#F8F7F2] rounded-xl p-6 space-y-5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[#A3E635] font-medium">Annual Footprint Estimate</span>
              <span className="text-xs font-mono tabular-nums text-[#D8E5DA]">
                {result.deltaFromGlobalPct > 0 ? '+' : ''}
                {result.deltaFromGlobalPct}% vs Global Avg
              </span>
            </div>

            <div>
              <div
                data-testid="carbon-total-tonnes"
                className="text-5xl font-bold font-mono tabular-nums"
              >
                {result.totalTonnesCo2e}
              </div>
              <div className="text-xs text-[#D8E5DA] mt-1">
                tonnes CO2e / year ({result.totalKgCo2e.toLocaleString()} kgCO2e)
              </div>
            </div>

            {/* Stacked Horizontal Breakdown */}
            <div className="space-y-2">
              <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-white/10">
                {categories.map((c) => {
                  const pct =
                    result.totalKgCo2e > 0 ? (c.kg / result.totalKgCo2e) * 100 : 25;
                  return (
                    <div
                      key={c.label}
                      style={{ width: `${pct}%`, backgroundColor: c.color }}
                      title={`${c.label}: ${c.kg} kgCO2e`}
                    />
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-xs pt-2">
                {categories.map((c) => (
                  <div key={c.label} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                    <span className="flex items-center gap-2 text-[#D8E5DA]">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: c.color, border: '1px solid rgba(255,255,255,0.25)' }}
                      />
                      {c.label}
                    </span>
                    <span className="font-mono tabular-nums font-semibold">
                      {c.kg} kg
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Benchmark Bar */}
            <div className="pt-3 border-t border-white/15 space-y-2 text-xs">
              <div className="flex justify-between text-[#D8E5DA]">
                <span>1.5°C Target: {result.parisTargetTonnes} t</span>
                <span>Global Avg: {result.globalAverageTonnes} t</span>
              </div>
              <p className="text-[11px] text-[#B6CBB9] leading-relaxed">
                {result.methodologyNote}
              </p>
            </div>

            <div className="space-y-2">
              {activeRole === 'guest' ? (
                <div className="bg-white/10 rounded-lg p-3 text-xs space-y-2">
                  <p className="text-[#F8F7F2]">
                    Guest mode is read-only. Switch to User role in one click to save calculations to your profile.
                  </p>
                  <button
                    type="button"
                    onClick={() => onSelectRole('user')}
                    className="px-3 py-1.5 bg-[#A3E635] text-[#0F2E1E] font-semibold rounded-md cursor-pointer"
                  >
                    Switch to User Role
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-2.5 bg-[#A3E635] text-[#0F2E1E] text-sm font-semibold rounded-lg hover:bg-[#BEF264] disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Saving Estimate...' : 'Save Calculation to Dashboard'}
                </button>
              )}

              {feedback && (
                <p
                  role="status"
                  className={`text-xs px-3 py-2 rounded-lg ${
                    feedback.type === 'success'
                      ? 'bg-[#15803D] text-white'
                      : 'bg-[#991B1B] text-white'
                  }`}
                >
                  {feedback.text}
                </p>
              )}
            </div>
          </section>

          {/* Personalized Recommendations */}
          <section className="bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#0F2E1E]">Priority Reduction Actions</h2>
            <div className="space-y-3">
              {result.recommendations.map((rec) => (
                <div key={rec.title} className="p-3.5 bg-[#F8F7F2] border border-[#EAECE7] rounded-lg space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#0F2E1E]">{rec.title}</h3>
                    <span className="text-xs font-mono tabular-nums font-semibold text-[#15803D] shrink-0">
                      -{rec.potentialAnnualSavingKg} kg/yr
                    </span>
                  </div>
                  <p className="text-xs text-[#4B5E53]">{rec.rationale}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Documented Assumptions */}
          <section className="bg-white border border-[#DDE3DD] rounded-xl p-6 space-y-3">
            <h2 className="text-base font-bold text-[#0F2E1E]">
              Documented Emission Factors &amp; Assumptions
            </h2>
            <ul className="space-y-2 text-xs text-[#4B5E53] list-disc pl-4 leading-relaxed">
              {result.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
