import AppHeader from '../AppHeader'
import ChargesPanel from '../ChargesPanel'
import ItemsPanel from '../ItemsPanel'
import OcrPreviewPanel from '../OcrPreviewPanel'
import ParticipantsPanel from '../ParticipantsPanel'
import ReceiptOverviewPanel from '../ReceiptOverviewPanel'
import SummaryPanel from '../SummaryPanel'
import type { ReceiptSplitterModel } from '../../hooks/useReceiptSplitter'

type SplitterScreenProps = {
  splitter: ReceiptSplitterModel
}

export default function SplitterScreen({ splitter }: SplitterScreenProps) {
  const {
    receiptState,
    personDraft,
    participants,
    summaryRows,
    subtotal,
    taxAmount,
    tipAmount,
    feesAmount,
    discountAmount,
    receiptTotal,
    remainingTotal,
    unassignedTotal,
    ocrStatus,
    ocrProgress,
    isOcrProcessing,
    receiptPreviewUrl,
    notice,
    ocrPreview,
    setPersonDraft,
    updateTitle,
    addParticipant,
    removeParticipant,
    addItem,
    updateItem,
    removeItem,
    toggleAssignee,
    processReceiptFile,
    retryReceiptOcr,
    copyShareLink,
    copySummary,
    clearReceipt,
    updateCharge,
  } = splitter

  return (
    <main className="min-h-screen bg-gray-900 p-4 text-white">
      <div className="mx-auto max-w-md space-y-4">
        <AppHeader title="Receipt Splitter" />

        <ReceiptOverviewPanel
          title={receiptState.title}
          receiptTotal={receiptTotal}
          unassignedTotal={unassignedTotal}
          remainingTotal={remainingTotal}
          participantCount={participants.length}
          receiptPreviewUrl={receiptPreviewUrl}
          isOcrProcessing={isOcrProcessing}
          ocrStatus={ocrStatus}
          ocrProgress={ocrProgress}
          notice={notice}
          onTitleChange={updateTitle}
          onReceiptFileSelect={processReceiptFile}
          onRetryReceiptOcr={retryReceiptOcr}
          onCopyShareLink={copyShareLink}
          onCopySummary={copySummary}
          onClearReceipt={clearReceipt}
        />

        <ParticipantsPanel
          personDraft={personDraft}
          participants={participants}
          onPersonDraftChange={setPersonDraft}
          onAddParticipant={addParticipant}
          onRemoveParticipant={removeParticipant}
        />

        <ItemsPanel
          items={receiptState.items}
          participants={participants}
          onAddItem={addItem}
          onUpdateItem={updateItem}
          onRemoveItem={removeItem}
          onToggleAssignee={toggleAssignee}
        />

        <ChargesPanel
          tax={receiptState.tax}
          tip={receiptState.tip}
          fees={receiptState.fees}
          discount={receiptState.discount}
          onChargeChange={updateCharge}
        />

        <SummaryPanel
          subtotal={subtotal}
          taxAmount={taxAmount}
          tipAmount={tipAmount}
          feesAmount={feesAmount}
          discountAmount={discountAmount}
          receiptTotal={receiptTotal}
          summaryRows={summaryRows}
        />

        <OcrPreviewPanel ocrPreview={ocrPreview} />
      </div>
    </main>
  )
}