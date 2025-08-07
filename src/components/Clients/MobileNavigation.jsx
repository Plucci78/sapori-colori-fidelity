import React from 'react'
import './MobileNavigation.css'

const MobileNavigation = ({ activeSection, onSectionChange, onGemClick, customerPoints }) => {
  const navItems = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'prizes', icon: '🎁', label: 'Premi' },
    { id: 'history', icon: '📊', label: 'Storico' },
    { id: 'gem', icon: '💎', label: 'QR Code', isGem: true },
    { id: 'referral', icon: '👥', label: 'Referral' },
    { id: 'profile', icon: '👤', label: 'Profilo' },
    { id: 'settings', icon: '⚙️', label: 'Impostazioni' }
  ]

  return (
    <div className="mobile-navigation">
      <div className="nav-container">
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activeSection === item.id ? 'active' : ''} ${item.isGem ? 'gem-button' : ''}`}
            onClick={() => item.isGem ? onGemClick() : onSectionChange(item.id)}
          >
            {item.isGem ? (
              <div className="gem-container">
                <div className="gem-icon">
                  <img 
                    src="/gemma-rossa.png" 
                    alt="Gemma" 
                    className="gem-image"
                  />
                  <div className="gem-points">{customerPoints}</div>
                </div>
                <div className="gem-glow"></div>
              </div>
            ) : (
              <>
                <div className="nav-icon">{item.icon}</div>
                <div className="nav-label">{item.label}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default MobileNavigation