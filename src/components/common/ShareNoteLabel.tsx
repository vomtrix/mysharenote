import { useMemo } from 'react';
import { formatSharenoteLabel } from '@utils/helpers';

// const SHARENODE_HIGHLIGHT_COLOR = '#075035';
const SHARENODE_HIGHLIGHT_FONT = '"Abril Fatface", cursive';

interface ShareNoteLabelProps {
  value?: number | string | null;
  className?: string;
  placeholder?: string;
}

const ShareNoteLabel = ({ value, className, placeholder = '' }: ShareNoteLabelProps) => {
  const label = useMemo(() => formatSharenoteLabel(value), [value]);
  if (!label) {
    return <span className={className}>{placeholder}</span>;
  }

  const highlightIndex = label.search(/z/i);
  if (highlightIndex === -1) {
    return <span className={className}>{label}</span>;
  }

  return (
    <span className={className}>
      {label.slice(0, highlightIndex)}
      <span
        style={{
          // color: SHARENODE_HIGHLIGHT_COLOR,
          fontFamily: SHARENODE_HIGHLIGHT_FONT
        }}>
        {label[highlightIndex]}
      </span>
      {label.slice(highlightIndex + 1)}
    </span>
  );
};

export default ShareNoteLabel;
