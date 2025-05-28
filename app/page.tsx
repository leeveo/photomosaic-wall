import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Bienvenue sur PhotoMosaic 🎨</h1>
      <p>Commencez en configurant votre mur photo :</p>
      <Link href="/setup">
        <button style={{ padding: '1rem 2rem', fontSize: '18px' }}>
          🛠️ Lancer la configuration
        </button>
      </Link>
    </main>
  )
}
