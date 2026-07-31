import AppHeader from '../AppHeader'
import ChargesPanel from '../ChargesPanel'
import ItemsPanel from '../ItemsPanel'
import OcrPreviewPanel from '../OcrPreviewPanel'
import ParticipantsPanel from '../ParticipantsPanel'
import ReceiptOverviewPanel from '../ReceiptOverviewPanel'
import SummaryPanel from '../SummaryPanel'
import { useReceiptSplitter } from '../../hooks/useReceiptSplitter'

export default function SplitterScreen() {
  const {
    receiptState,
    summaryLocation,
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
    updatePayerVenmo,
    addParticipant,
    removeParticipant,
    addItem,
    updateItem,
    removeItem,
    setShare,
    processReceiptFile,
    retryReceiptOcr,
    copyShareLink,
    copySummary,
    clearReceipt,
    updateCharge,
  } = useReceiptSplitter()

  return (
    <main className="min-h-screen bg-app p-4 text-fg">
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
          payerVenmo={receiptState.payerVenmo}
          summaryLocation={summaryLocation}
          onTitleChange={updateTitle}
          onPayerVenmoChange={updatePayerVenmo}
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
          onSetShare={setShare}
        />

        <ChargesPanel
          tax={receiptState.tax}
          tip={receiptState.tip}
          fees={receiptState.fees}
          discount={receiptState.discount}
          onChargeChange={updateCharge}
        />

        <SummaryPanel
          receiptTitle={receiptState.title}
          payerVenmo={receiptState.payerVenmo}
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
