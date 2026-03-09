import React from 'react'
import BackButton from '../../components/BackButton'

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 'var(--space-xl)' }}>
    <h2 style={{ fontFamily: 'var(--font-mono)', borderBottom: '2px solid var(--military-green, #4b5320)', paddingBottom: 6, marginBottom: 12 }}>{title}</h2>
    {children}
  </div>
)

const Task = ({ icon, title, children }) => (
  <div style={{ background: 'rgba(75,83,32,0.05)', border: '1px solid var(--border-color, #ccc)', borderRadius: 8, padding: '14px 16px', marginBottom: 10 }}>
    <div style={{ fontWeight: 700, marginBottom: 6, fontSize: '0.95rem' }}>{icon} {title}</div>
    <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>{children}</div>
  </div>
)

const Step = ({ n, children }) => (
  <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
    <span style={{ fontWeight: 700, color: 'var(--military-green, #4b5320)', minWidth: 22 }}>{n}.</span>
    <span>{children}</span>
  </div>
)

export default function GuideAdministratif() {
  return (
    <div className="container" style={{ maxWidth: 900, paddingBottom: 'var(--space-xxl)' }} id="guide-administratif">
      <BackButton label="← Retour" />

      <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', paddingTop: 'var(--space-md)' }}>
        <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', margin: '0 0 8px' }}>
          📋 GUIDE DE FORMATION
        </h1>
        <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 400, color: 'var(--text-muted)', margin: 0 }}>
          Bataillon Administratif — Archives 7e Armeekorps
        </h2>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
          Document interne — Formation des recenseurs
        </div>
      </div>

      <Section title="I. RÔLE DU BATAILLON ADMINISTRATIF">
        <p style={{ lineHeight: 1.7, marginBottom: 12 }}>
          Le <strong>Bataillon Administratif</strong> (groupe "Administratif" sur le site) est le pilier bureaucratique du régiment.
          Vous êtes les <strong>recenseurs</strong> — ceux qui maintiennent l'ordre dans les archives, vérifient les informations,
          et assurent que chaque soldat existe correctement dans le système.
        </p>
        <p style={{ lineHeight: 1.7, marginBottom: 12 }}>
          Pensez à vous comme les <strong>modérateurs</strong> du site : vous vérifiez la forme, pas le fond.
          Les officiers valident le contenu militaire ; vous, vous assurez que tout est propre, correct, et conforme.
        </p>

        <div style={{ background: '#f5f0e1', padding: 14, borderRadius: 8, border: '1px solid #d4c9a8', marginTop: 16 }}>
          <strong>🎯 Vos missions principales :</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Recenser et créer les fiches des nouveaux effectifs</li>
            <li>Vérifier la cohérence entre Discord et le site</li>
            <li>Valider les rapports (modération de forme)</li>
            <li>Gérer les Soldbücher (livrets militaires)</li>
            <li>Tenir le bureau de recensement en jeu</li>
            <li>Signer et tamponner les documents officiels</li>
          </ul>
        </div>
      </Section>

      <Section title="II. ACCÈS ET PERMISSIONS">
        <p style={{ lineHeight: 1.7, marginBottom: 12 }}>
          En tant qu'administratif, vous avez accès à des fonctionnalités que les soldats ordinaires n'ont pas.
          Voici ce que vous pouvez faire :
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: 16 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Fonctionnalité</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Soldat</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', background: 'rgba(75,83,32,0.1)' }}>Administratif</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Officier</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Créer/modifier des effectifs', '❌', '✅', '✅'],
              ['Modifier les Soldbücher', '(le sien)', '✅ tous', '✅ tous'],
              ['Valider les rapports (forme)', '❌', '✅', '✅'],
              ['Approuver les rapports (fond)', '❌', '❌', '✅'],
              ['Signer les attestations', '❌', '✅', '✅'],
              ['Tamponner les documents', '❌', '✅', '✅'],
              ['Gérer les dossiers', '❌', '✅', '✅'],
              ['Modérer le contenu', '❌', '✅', '✅'],
              ['Présence de service (PdS)', '❌', '✅', '✅'],
              ['Envoyer des télégrammes', '✅', '✅', '✅'],
            ].map(([feat, sol, admin, off], i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '6px 12px' }}>{feat}</td>
                <td style={{ padding: '6px 12px', textAlign: 'center' }}>{sol}</td>
                <td style={{ padding: '6px 12px', textAlign: 'center', background: 'rgba(75,83,32,0.05)' }}>{admin}</td>
                <td style={{ padding: '6px 12px', textAlign: 'center' }}>{off}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="III. TÂCHES QUOTIDIENNES">

        <Task icon="👤" title="1. Recensement des nouveaux effectifs">
          <p>Quand un nouveau soldat rejoint le régiment sur Discord, il doit être ajouté au site.</p>
          <Step n={1}>Allez dans <strong>Effectifs → + Nouvel effectif</strong></Step>
          <Step n={2}>Remplissez : nom, prénom, grade, unité (vérifiez sur Discord)</Step>
          <Step n={3}>Créez le compte utilisateur associé si nécessaire</Step>
          <Step n={4}>Vérifiez que le grade Discord correspond au grade sur le site</Step>
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#fff3cd', borderRadius: 4, fontSize: '0.8rem' }}>
            ⚠️ <strong>Important :</strong> Le nom RP sur le site doit correspondre exactement au pseudo Discord RP.
            Vérifiez les grades, les unités, et les orthographes.
          </div>
        </Task>

        <Task icon="📋" title="2. Validation des rapports (modération)">
          <p>Votre rôle est de vérifier la <strong>forme</strong> du rapport, pas le fond militaire.</p>
          <Step n={1}>Allez dans <strong>Rapports</strong> — cherchez ceux avec ⏳ (en attente)</Step>
          <Step n={2}>Ouvrez le rapport et vérifiez :
            <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
              <li>Pas de contenu inapproprié (insultes, images vulgaires)</li>
              <li>Le rapport est lisible et compréhensible</li>
              <li>Les informations de base sont remplies (auteur, date, unité)</li>
            </ul>
          </Step>
          <Step n={3}>Cliquez <strong>✅ Valider ce rapport</strong></Step>
          <Step n={4}>Choisissez :
            <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
              <li><strong>Valider uniquement</strong> — le rapport est approuvé par vous</li>
              <li><strong>Valider + Envoyer à un officier</strong> — sélectionnez l'officier qui validera le fond</li>
            </ul>
          </Step>
          <Step n={5}>Signez avec votre signature + tampon</Step>
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#d4edda', borderRadius: 4, fontSize: '0.8rem' }}>
            ✅ Votre validation apparaîtra comme : <strong>"Lu et enregistré par Bataillon Administratif [votre nom]"</strong>
          </div>
        </Task>

        <Task icon="📖" title="3. Gestion des Soldbücher">
          <p>Le Soldbuch est le livret militaire de chaque soldat. Vous pouvez les éditer pour tous les effectifs.</p>
          <Step n={1}>Allez dans <strong>Effectifs → cliquez sur un soldat → Soldbuch</strong></Step>
          <Step n={2}>Vérifiez que les informations sont complètes :
            <ul style={{ margin: '4px 0', paddingLeft: 16 }}>
              <li>Personalbeschreibung (description personnelle)</li>
              <li>Attestations à jour</li>
              <li>Signatures présentes</li>
            </ul>
          </Step>
          <Step n={3}>Vous pouvez tamponner et signer les Soldbücher en tant que référent</Step>
        </Task>

        <Task icon="🔍" title="4. Vérification Discord ↔ Site">
          <p>Régulièrement, vérifiez la cohérence entre le Discord et le site :</p>
          <Step n={1}><strong>Grades</strong> — Le grade sur Discord doit correspondre au grade sur le site</Step>
          <Step n={2}><strong>Unités</strong> — Vérifiez que chaque soldat est dans la bonne unité</Step>
          <Step n={3}><strong>Départs</strong> — Si un soldat quitte le Discord, signalez-le (ne supprimez pas, marquez comme inactif)</Step>
          <Step n={4}><strong>Promotions</strong> — Mettez à jour les grades après les promotions annoncées</Step>
        </Task>

        <Task icon="📝" title="5. Modération du contenu">
          <p>Vous avez accès à la modération :</p>
          <Step n={1}>Allez dans <strong>Admin → Modération</strong></Step>
          <Step n={2}>Vérifiez les rapports en attente</Step>
          <Step n={3}>Refusez tout contenu inapproprié avec une raison</Step>
        </Task>
      </Section>

      <Section title="IV. LE BUREAU DE RECENSEMENT (EN JEU)">
        <p style={{ lineHeight: 1.7, marginBottom: 12 }}>
          En jeu (Garry's Mod), le Bataillon Administratif tient un <strong>bureau de recensement</strong>.
          C'est une tente ou un bâtiment où les nouveaux arrivants viennent se faire enregistrer.
        </p>

        <div style={{ background: 'rgba(75,83,32,0.05)', padding: 14, borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 16 }}>
          <strong>🏕️ Comment tenir le bureau :</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Installez la tente administrative sur le camp</li>
            <li>Ayez le site ouvert sur un second écran ou téléphone</li>
            <li>Quand un nouveau soldat se présente :
              <ul style={{ paddingLeft: 16 }}>
                <li>Demandez son nom RP complet et son grade</li>
                <li>Vérifiez qu'il existe sur le site, sinon créez sa fiche</li>
                <li>Remplissez son Soldbuch si nécessaire</li>
                <li>Donnez-lui ses papiers RP (si applicable)</li>
              </ul>
            </li>
            <li>Tenez un registre des passages (rapport journalier)</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ flex: '1 1 300px', maxWidth: 420 }}>
            <img src="/assets/bureau-admin-1.jpg" alt="Bureau administratif — vue intérieure" style={{ width: '100%', borderRadius: 8, border: '2px solid var(--border-color, #ccc)' }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>Vue intérieure — bureau, chaises, rangements</p>
          </div>
          <div style={{ flex: '1 1 300px', maxWidth: 420 }}>
            <img src="/assets/bureau-admin-2.jpg" alt="Bureau administratif — vue extérieure" style={{ width: '100%', borderRadius: 8, border: '2px solid var(--border-color, #ccc)' }} />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>Vue extérieure — tente "Wachposten" avec paravent photo d'identité</p>
          </div>
        </div>
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(75,83,32,0.05)', borderRadius: 6, fontSize: '0.85rem' }}>
          <strong>Éléments du bureau :</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            <li><strong>Bureau</strong> — pour remplir les documents et accueillir les soldats</li>
            <li><strong>Chaises</strong> — pour le recenseur et le soldat en face</li>
            <li><strong>Rangements</strong> — pour les dossiers et papiers administratifs</li>
            <li><strong>Paravent / fond</strong> — pour les photos d'identité des effectifs</li>
            <li><strong>Panneau "Wachposten"</strong> — signalétique du poste</li>
          </ul>
        </div>
      </Section>

      <Section title="V. SIGNATURES ET TAMPONS">
        <Task icon="✍️" title="Votre signature personnelle">
          <Step n={1}>Allez dans n'importe quel document à signer</Step>
          <Step n={2}>Dessinez votre signature une fois — elle sera sauvegardée</Step>
          <Step n={3}>Les prochaines fois, elle sera pré-chargée automatiquement</Step>
        </Task>

        <Task icon="🔴" title="Les tampons">
          <p>Les tampons sont dans la <strong>Bibliothèque</strong>. Vous avez accès aux tampons de votre unité et aux tampons généraux.</p>
          <p>Quand vous signez un document, vous pouvez choisir :</p>
          <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li><strong>Signature seule</strong> — votre signature manuscrite</li>
            <li><strong>Tampon seul</strong> — un tampon officiel</li>
            <li><strong>Tampon + Signature</strong> — les deux superposés (recommandé pour les validations)</li>
          </ul>
        </Task>
      </Section>

      <Section title="VI. RÈGLES ET BONNES PRATIQUES">
        <div style={{ display: 'grid', gap: 10 }}>
          {[
            ['✅', 'Toujours vérifier avant de valider', 'Lisez le rapport en entier, vérifiez les noms et dates.'],
            ['✅', 'Cohérence Discord ↔ Site', 'Faites un check hebdomadaire. Les erreurs s\'accumulent vite.'],
            ['✅', 'Utilisez tampon + signature', 'Ça officialise le document. Un rapport sans tampon a moins de poids.'],
            ['❌', 'Ne validez pas le fond', 'Vous vérifiez la forme. Le contenu militaire, c\'est le travail des officiers.'],
            ['❌', 'Ne supprimez jamais un effectif', 'Marquez-le comme inactif. Les archives doivent rester complètes.'],
            ['❌', 'Ne modifiez pas un rapport publié', 'Un rapport publié est un document officiel. Créez un correctif si nécessaire.'],
          ].map(([icon, title, desc], i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: icon === '❌' ? 'rgba(200,50,50,0.05)' : 'rgba(50,150,50,0.05)', borderRadius: 6 }}>
              <span style={{ fontSize: '1.2rem' }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="VII. EN CAS DE PROBLÈME">
        <p style={{ lineHeight: 1.7 }}>
          Si vous rencontrez un bug, un problème de permissions, ou une situation que vous ne savez pas gérer :
        </p>
        <ol style={{ paddingLeft: 20, lineHeight: 2 }}>
          <li>Ne paniquez pas — rien n'est irréversible</li>
          <li>Prenez un screenshot du problème</li>
          <li>Contactez l'administrateur (via Discord ou télégramme sur le site)</li>
          <li>Notez ce que vous faisiez quand le problème est apparu</li>
        </ol>
      </Section>

      <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)', padding: 'var(--space-lg)', borderTop: '2px solid var(--border-color)' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          📜 Archives 7e Armeekorps — Document de formation interne
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Bataillon Administratif — Mars 2026
        </p>
      </div>
    </div>
  )
}
