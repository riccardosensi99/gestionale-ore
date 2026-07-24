export default function SummaryCards({ summary }) {
  const cards = [
    { label: 'Giorni lavorati', value: summary?.workedDays ?? 0 },
    { label: 'Totale ore', value: summary?.totalHours ?? 0 },
    { label: 'Giorni di ferie', value: summary?.vacationDays ?? 0 },
  ];
  return (
    <div className="cards">
      {cards.map((c) => (
        <div className="card" key={c.label}>
          <div className="label">{c.label}</div>
          <div className="value">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
