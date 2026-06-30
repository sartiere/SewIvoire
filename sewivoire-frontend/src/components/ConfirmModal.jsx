import { AlertTriangle, HelpCircle } from 'lucide-react'

/**
 * Fenêtre de confirmation réutilisable (au design SewIvoire).
 * Contrôlée par le parent : `open`, `loading` et les callbacks.
 */
function ConfirmModal({
  open,
  titre = 'Confirmer ?',
  message = '',
  confirmLabel = 'Confirmer',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-nuit/60 backdrop-blur-sm"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-5 text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-100' : 'bg-or/20'}`}>
            {danger
              ? <AlertTriangle className="w-7 h-7 text-red-600" />
              : <HelpCircle className="w-7 h-7 text-or" />}
          </div>
          <h3 className="font-titre text-xl font-bold text-nuit mb-1.5">{titre}</h3>
          <p className="text-gray-500 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-colors disabled:opacity-50 ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-nuit hover:bg-or hover:text-nuit'
            }`}
          >
            {loading ? 'Traitement…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
