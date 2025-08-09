// ActionButton.tsx
import React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { twMerge } from 'tailwind-merge';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  hotkey?: string;
  icon: React.ReactNode;
  label: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ 
  hotkey, 
  icon, 
  label, 
  className, 
  ...props 
}) => {
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  useHotkeys(hotkey || '', () => {
    buttonRef.current?.click();
  }, {
    enabled: !!hotkey,
    preventDefault: true,
  });

  return (
    <button
      ref={buttonRef}
      className={twMerge(
        "w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800/30 rounded-lg text-left transition-colors duration-200 text-sm",
        className
      )}
      {...props}
    >
      {icon}
      <span className="text-gray-300">{label}</span>
      {hotkey && (
        <span className="ml-auto text-xs text-gray-500">
          {hotkey.split('+').map(key => key === 'mod' ? 'Ctrl' : key).join('+')}
        </span>
      )}
    </button>
  );
};