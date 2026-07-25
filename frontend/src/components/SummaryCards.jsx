export default function SummaryCards({ summary }) {
  const cards = [
    {
      label: 'Giorni lavorati',
      value: summary?.workedDays ?? 0,
      hint: summary?.expectedWorkingDays ? `su ${summary.expectedWorkingDays} lavorativi` : null,
      tile: 'G',
      tone: '',
    },
    { label: 'Totale ore', value: summary?.totalHours ?? 0, tile: 'O', tone: 'purple' },
    { label: 'Giorni di ferie', value: summary?.vacationDays ?? 0, tile: 'F', tone: 'green' },
    { label: 'Malattia/Permessi', value: summary?.sickDays ?? 0, tile: 'M', tone: 'amber' },
    { label: 'Giorni di riposo', value: summary?.restDays ?? 0, tile: 'R', tone: 'grey' },
  ];
  return (
    <div className="cards">
      {cards.map((c) => (
        <div className="kpi" key={c.label}>
          <div className="head">
            <span className={`tile ${c.tone}`}>{c.tile}</span>
            <span className="label">{c.label}</span>
          </div>
          <div className="value">{c.value}</div>
          {c.hint && <div className="hint">{c.hint}</div>}
        </div>
      ))}
    </div>
  );
}
