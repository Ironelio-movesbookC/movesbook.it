import { Search } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

type Props = {
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  className?: string;
};

export const SearchInput = ({ value, onChange, className, ...props }: Props) => {
  return (
    <div className="relative">
      <Search
        className="absolute text-gray left-0 top-1/2 -translate-y-1/2 w-5 h-5 ml-3"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        className={twMerge(
          'bg-transparent rounded-lg border border-gray/25 h-10  pl-11 pr-2 font-mediu hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray font-medium',
          className,
        )}
        {...props}
      />
    </div>
  );
};
