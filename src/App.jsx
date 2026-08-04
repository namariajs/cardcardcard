import { useEffect, useState } from 'react';
import { useApp } from './context/AppContext';
import { GOM_ONLY_TABS } from './lib/constants';
import TopBar from './components/TopBar';
import Hero from './components/Hero';
import Tabs from './components/Tabs';
import StatsBar from './components/StatsBar';
import MenuTab from './components/tabs/MenuTab';
import MyPanelTab from './components/tabs/MyPanelTab';
import PaymentsTab from './components/tabs/PaymentsTab';
import FreteTab from './components/tabs/FreteTab';
import ItemsTab from './components/tabs/ItemsTab';
import InterTab from './components/tabs/InterTab';
import JoinersTab from './components/tabs/JoinersTab';
import RegistryTab from './components/tabs/RegistryTab';
import ArquivoTab from './components/tabs/ArquivoTab';

export default function App() {
  const { unlocked } = useApp();
  const [activeTab, setActiveTab] = useState('menu');
  const [itemsQuery, setItemsQuery] = useState('');
  const [itemsJoinerFilter, setItemsJoinerFilter] = useState('');

  useEffect(() => {
    if (!unlocked && GOM_ONLY_TABS.includes(activeTab)) setActiveTab('menu');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  function goToItemsWithCeg(ceg) {
    setActiveTab('items');
    setItemsQuery(ceg);
  }
  function goToItems() {
    setActiveTab('items');
  }
  function goToItemsWithJoiner(joiner) {
    setActiveTab('items');
    setItemsJoinerFilter(joiner);
  }

  return (
    <>
      <TopBar />
      <Hero />
      <Tabs activeTab={activeTab} onChange={setActiveTab} />
      <StatsBar onFilterByCeg={goToItemsWithCeg} onGoToItems={goToItems} />

      <div className="main">
        {activeTab === 'menu' && <MenuTab />}
        {activeTab === 'mypanel' && <MyPanelTab />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'frete' && <FreteTab />}
        {activeTab === 'items' && (
          <ItemsTab
            externalQuery={itemsQuery}
            onExternalQueryConsumed={() => setItemsQuery('')}
            externalJoinerFilter={itemsJoinerFilter}
            onExternalJoinerFilterConsumed={() => setItemsJoinerFilter('')}
          />
        )}
        {activeTab === 'inter' && <InterTab />}
        {activeTab === 'joiners' && <JoinersTab onPickJoiner={goToItemsWithJoiner} />}
        {activeTab === 'registry' && <RegistryTab />}
        {activeTab === 'arquivo' && <ArquivoTab />}
      </div>

      <footer>Feito com carinho para organizar seus group orders · GO Desk</footer>
    </>
  );
}
