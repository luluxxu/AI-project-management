import SectionCard from "../components/SectionCard";

export default function ActivityPage({ store }) {
  return (
<<<<<<< HEAD
    <div className="grid gap-4">
=======
    <div className="page-grid">
>>>>>>> f230ff4d41077ea9e3a32311e6cbac8c8bb22f66
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
