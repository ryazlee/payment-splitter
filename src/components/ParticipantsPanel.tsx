import Button from './Button'
import SectionCard from './SectionCard'

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
    <SectionCard title="People" subtitle="Tap a name to remove them from the split.">
      <div className="stack">
        <div className="chip-row">
          {participants.length > 0 ? (
            participants.map((participant) => (
              <button
                key={participant}
                type="button"
                onClick={() => onRemoveParticipant(participant)}
                className="chip chip--active"
                title={`Remove ${participant}`}
              >
                {participant} ×
              </button>
            ))
          ) : (
            <p className="empty-hint">Add the people sharing this receipt.</p>
          )}
        </div>

        <div className="inline-add">
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
            className="input"
          />
          <Button label="Add" onClick={onAddParticipant} />
        </div>
      </div>
    </SectionCard>
  )
}
