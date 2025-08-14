export const metadata = {
  title: 'Termitas',
  description: 'Registro de trabajos – Termitas',
};

import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
