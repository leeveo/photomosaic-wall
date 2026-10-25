import Link from 'next/link'
import { FiArrowRight, FiCamera, FiGrid, FiSliders, FiUsers } from 'react-icons/fi'
import Brand from '@/components/Brand'

export default function Home() {
  return <div className="wall-home">
    <header className="wall-nav"><Brand /><span className="nav-caption">Le studio de vos événements</span><Link className="btn-secondary" href="/admin">Ouvrir le studio <FiArrowRight /></Link></header>
    <main>
      <section className="wall-hero">
        <div className="hero-copy"><span className="wall-pill"><FiGrid /> Des instants à partager</span>
          <h1>Chaque photo compte.<br /><span>Ensemble, créons<br />le grand souvenir.</span></h1>
          <p>Transformez les sourires de vos invités en une mosaïque collective. Un mur photo qui prend vie, un événement qui reste.</p>
          <div className="hero-actions"><Link className="btn-primary" href="/admin">Créer mon événement <FiArrowRight /></Link><a className="btn-secondary" href="#comment-ca-marche">Comment ça marche ?</a></div>
          <div className="hero-note"><FiUsers /> Pensé pour rassembler. Simple à organiser.</div>
        </div>
        <div className="mosaic-illustration" aria-label="Illustration d’une mosaïque collective">
          <div className="illustration-top"><span><i /> Votre prochain grand souvenir</span><FiGrid /></div>
          <div className="illustration-grid" aria-hidden="true">{Array.from({ length: 48 }, (_, i) => <div key={i} className={`illustration-tile tile-${(i * 7 + Math.floor(i / 8)) % 6}`}><FiUsers /></div>)}</div>
          <div className="illustration-bottom"><span><FiCamera /> Un sourire, une pièce du souvenir.</span><span className="wall-pill">Ensemble</span></div>
          <div className="floating-note"><FiUsers /><div><strong>Une belle histoire collective</strong><span>Vos invités en sont les créateurs.</span></div></div>
        </div>
      </section>
      <section className="workflow-section" id="comment-ca-marche"><div className="section-heading"><span className="wall-eyebrow">De l’idée au souvenir</span><h2>Trois étapes. Des centaines de sourires.</h2><p>Vous imaginez le mur. Vos invités lui donnent vie.</p></div>
        <div className="workflow-grid">{[
          { icon: FiSliders, title: 'Imaginez votre mosaïque', text: 'Créez un projet, choisissez votre image et ajustez la grille à votre événement.' },
          { icon: FiCamera, title: 'Invitez les sourires', text: 'Partagez le QR code du photobooth. Chaque invité prend sa photo et participe.' },
          { icon: FiGrid, title: 'Révélez le grand souvenir', text: 'Affichez votre mosaïque en plein écran et regardez-la se construire au fil des photos.' },
        ].map(({ icon: Icon, title, text }, i) => <article className="workflow-card" key={title}><div className="step-top"><span className="step-icon"><Icon /></span><span>0{i + 1}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>
      <section className="studio-cta"><div><span className="wall-eyebrow">À vous de jouer</span><h2>Votre prochain événement<br />mérite son grand souvenir.</h2></div><Link className="btn-primary" href="/admin">Entrer dans le studio <FiArrowRight /></Link></section>
    </main><footer className="wall-footer"><Brand /><span>Des photos individuelles. Une émotion collective.</span></footer>
  </div>
}
