import { EmptyState, ErrorCard, LoadingCard } from "@/components/ui";
import { initials } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import { usePortal } from "@/state/PortalStore";

export function ProgramsPage() {
  const { client } = usePortal();
  const state = useAsync(async () => {
    const [programs, templates, members] = await Promise.all([
      client.programs.list(),
      client.programs.listTemplates(),
      client.members.list()
    ]);
    return { programs, templates, members };
  });

  if (state.error) return <ErrorCard message={state.error} onRetry={() => void state.reload()} />;
  if (state.loading || !state.data) return <LoadingCard height={420} />;

  const { programs, templates, members } = state.data;

  return (
    <>
      <div className="page-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {programs.map((program) => {
          const assigned = members.filter((member) => member.assignedProgramId === program.id);
          const programTemplates = program.templateIds
            .map((id) => templates.find((template) => template.id === id))
            .filter((template) => template !== undefined);
          return (
            <div key={program.id} className="card">
              <div className="card-title">
                {program.name}
                <span className="hint">{program.weeks} weeks</span>
              </div>
              <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
                {program.focus}
              </div>
              <div className="field">
                <span className="field-label">Workout templates</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {programTemplates.map((template) => (
                    <span key={template.id} className="badge blue">
                      {template.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="field-label">Assigned members · {assigned.length}</span>
                {assigned.length === 0 ? (
                  <div className="muted" style={{ fontSize: 12 }}>
                    Nobody yet — assign from a member's profile.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {assigned.slice(0, 8).map((member) => (
                      <div key={member.id} className="avatar" title={member.name}>
                        {initials(member.name)}
                      </div>
                    ))}
                    {assigned.length > 8 && (
                      <div className="avatar" title={`${assigned.length - 8} more`}>
                        +{assigned.length - 8}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-title">
          Workout template library
          <span className="hint muted">Shared with the member app</span>
        </div>
        {templates.length === 0 ? (
          <EmptyState icon="≡" message="No templates yet." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Template</th>
                  <th>Focus</th>
                  <th>Exercises</th>
                  <th>Est. duration</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td className="strong">{template.name}</td>
                    <td className="muted">{template.focus}</td>
                    <td className="muted">{template.exerciseIds.length}</td>
                    <td className="muted">~{template.estimatedMinutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
