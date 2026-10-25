import Link from 'next/link'

export default function Brand() {
  return <Link href="/" className="wall-brand" aria-label="PhotoMosaic — accueil">
    <span className="brand-symbol" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</span>
    PhotoMosaic<span className="brand-period">.</span>
  </Link>
}
