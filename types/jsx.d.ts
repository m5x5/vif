declare namespace JSX {
  interface IntrinsicElements {
    'remotestorage-widget': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      ref?: React.Ref<any>;
    };
  }
}