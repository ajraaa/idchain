const Sidebar = ({ menus, activeMenu, onMenuClick, walletAddress }) => {
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <aside className="owner-sidebar custom-sidebar">
      <nav className="sidebar-menu">
        {menus.map(menu => (
          <button
            key={menu.key}
            className={`sidebar-menu-item${activeMenu === menu.key ? ' active' : ''}`}
            onClick={() => onMenuClick(menu.key)}
          >
            <span className="sidebar-icon">{menu.icon}</span>
            <span className="sidebar-label">{menu.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-wallet-info sidebar-wallet-card">
        <span className="sidebar-wallet-label">Wallet:</span>
        <span className="sidebar-wallet-address">{formatAddress(walletAddress)}</span>
      </div>
    </aside>
  );
};

export default Sidebar; 