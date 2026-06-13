import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { LanguageCode, TranslationKey } from '@/i18n/languages'
import { SUPPORTED_LANGUAGES } from '@/i18n/languages'

type SettingsDialogProps = {
  open: boolean
  appVersion: string
  language: LanguageCode
  translate: (key: TranslationKey) => string
  onLanguageChange: (language: LanguageCode) => void
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({
  open,
  appVersion,
  language,
  translate,
  onLanguageChange,
  onOpenChange,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="settings-dialog">
        <DialogHeader>
          <DialogTitle>{translate('settings.title')}</DialogTitle>
          <DialogDescription>{translate('settings.description')}</DialogDescription>
        </DialogHeader>

        <div className="settings-dialog-body">
          <div className="settings-row">
            <div className="settings-row-label">{translate('settings.versionLabel')}</div>
            <div className="settings-version-value">{appVersion}</div>
          </div>

          <label className="settings-row" htmlFor="markan-language-select">
            <span className="settings-row-label">{translate('settings.languageLabel')}</span>
            <NativeSelect
              id="markan-language-select"
              value={language}
              onChange={(event) => onLanguageChange(event.currentTarget.value as LanguageCode)}
              aria-label={translate('settings.languageLabel')}
            >
              {SUPPORTED_LANGUAGES.map((item) => (
                <NativeSelectOption key={item.code} value={item.code}>
                  {item.code === 'ko'
                    ? translate('settings.language.korean')
                    : translate('settings.language.english')}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {translate('settings.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
