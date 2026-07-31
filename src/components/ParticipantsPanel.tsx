type ParticipantsPanelProps = {
  personDraft: string
  participants: string[]
  onPersonDraftChange: (value: string) => void
  onAddParticipant: () => void
  onRemoveParticipant: (name: string) => void
}

export default function ParticipantsPanel({
  personDraft,
  participants,
  onPersonDraftChange,
  onAddParticipant,
  onRemoveParticipant,
}: ParticipantsPanelProps) {
  return (
    <section className="space-y-3 rounded-app border border-border bg-surface p-4">
      <div className="flex flex-wrap gap-2">
        {participants.length > 0 ? (
          participants.map((participant) => (
            <button
              key={participant}
              type="button"
              onClick={() => onRemoveParticipant(participant)}
              className="rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-fg hover:bg-inset"
            >
              {participant}
            </button>
          ))
        ) : (
          <p className="text-sm text-fg-muted">Add the people sharing this receipt.</p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={personDraft}
          onChange={(event) => onPersonDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onAddParticipant()
            }
          }}
          placeholder="Person name"
          className="flex-1 rounded bg-inset px-3 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="button"
          onClick={onAddParticipant}
          className="rounded-[10px] bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast hover:opacity-90"
        >
          Add
        </button>
      </div>
    </section>
  )
}