import SectionCard from "../components/SectionCard";

export default function ActivityPage({ store }) {
  return (
    <div className="page-grid">
      <SectionCard title="Activity Log" subtitle="Simple audit trail for project actions">
        <ul className="activity-list">
          {store.scopedActivities.map((activity) => (
            <li key={activity.id}>
              <div>
                <strong>{new Date(activity.createdAt).toLocaleString()}</strong>
                <p>{activity.message}</p>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
