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
    <section className="space-y-3 rounded bg-gray-800 p-4">
      <div className="flex flex-wrap gap-2">
        {participants.length > 0 ? (
          participants.map((participant) => (
            <button
              key={participant}
              type="button"
              onClick={() => onRemoveParticipant(participant)}
              className="rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600"
            >
              {participant}
            </button>
          ))
        ) : (
          <p className="text-sm text-gray-400">Add the people sharing this receipt.</p>
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
          className="flex-1 rounded bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
        />
        <button
          type="button"
          onClick={onAddParticipant}
          className="rounded bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-100"
        >
          Add
        </button>
      </div>
    </section>
  )
}