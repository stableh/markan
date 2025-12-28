import { useSettingsStore } from '@/store/useSettingsStore';

export const TitleBar = () => {
  const { theme } = useSettingsStore();

  return (
    <div className="h-10 w-full flex items-center justify-center titlebar-drag-region bg-sidebar border-b border-border shrink-0 transition-colors duration-300">
      <div className="text-xs font-medium text-muted-foreground opacity-50 select-none">
        Markan
      </div>
    </div>
  );
};
