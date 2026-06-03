'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <span className="navbar__brand">Appointment Reminder</span>
      <ul className="navbar__links">
        <li>
          <Link
            href="/"
            className={`navbar__link ${pathname === '/' ? 'navbar__link--active' : ''}`}
          >
            New Appointment
          </Link>
        </li>
        <li>
          <Link
            href="/dashboard"
            className={`navbar__link ${pathname === '/dashboard' ? 'navbar__link--active' : ''}`}
          >
            Dashboard
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Appointment Reminder</title>
        <meta name="description" content="WhatsApp appointment reminder system — schedule and manage patient reminders." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
