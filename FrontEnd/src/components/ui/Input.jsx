import React from 'react';
import clsx from 'clsx';

const Input = ({ 
  label, 
  error, 
  helpText,
  className,
  required = false,
  ...props 
}) => {
  const inputId = props.id || props.name;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          'w-full px-3 py-2 border rounded-lg transition-colors outline-none shadow-sm',
          'placeholder:text-gray-400',
          error 
            ? 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          className
        )}
        {...props}
      />
      {helpText && !error && (
        <p className="text-gray-500 text-xs">{helpText}</p>
      )}
      {error && (
        <p className="text-red-600 text-xs">{error}</p>
      )}
    </div>
  );
};

export default Input;
