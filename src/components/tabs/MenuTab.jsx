import { formatLastUpdated } from '../../lib/format';

// Update this ISO timestamp (UTC) whenever the site's content/code changes — it's what
// "Última atualização" shows, converted to Brasília time automatically.
const LAST_UPDATED_ISO = '2026-08-03T12:00:00Z';

export default function MenuTab() {
  return (
    <>
      <div className="stat menu-update-box">
        <div className="stat-label">Última atualização</div>
        <div className="stat-value" style={{ fontSize: 16 }}>{formatLastUpdated(LAST_UPDATED_ISO)}</div>
      </div>

      <div className="menu-section-title">Termos e Informações</div>

      <div className="menu-card" style={{ marginBottom: 16 }}>
        <h4>Informações Gerais</h4>
        <ul>
          <li>Não sou loja.</li>
          <li>Só faço desconto para avarias graves. Não me responsabilizo por press marks, erros de impressão, etc.</li>
          <li>Aceito pagamentos via Pix e cartão de crédito. Para a opção de cartão, me chame no privado para calcular os juros e parcelas.</li>
          <li>Ao participar de uma CEG/venda/troca você automaticamente aceita e concorda com as informações dispostas aqui.</li>
          <li>Caso eu me sinta desconfortável com qualquer situação, me coloco no direito de fazer reembolso e remover a pessoa da CEG ou cancelar a venda.</li>
        </ul>
      </div>

      <div className="menu-grid cols-2">
        <div className="menu-card">
          <h4>Compras em Grupo</h4>
          <ul>
            <li>Seja paciente. Compras internacionais costumam demorar. Só participe se você entende e aceita os prazos mais longos.</li>
            <li>Não faço reembolsos por desistência; desistência somente com repasse de vaga.</li>
            <li>Em caso de taxa, ela será dividida por itens e então igualmente por participantes da CEG. Em caso de itens maiores como álbuns, a taxa será mais alta do que para itens menores como photocards.</li>
            <li>Ao confirmar a participação você entende que deve pagar dentro do prazo estipulado. Caso o pagamento do item não seja realizado no tempo determinado, o participante será removido da CEG e de CEGs futuras.</li>
            <li>Frete internacional e taxa devem ser pagos dentro do prazo estipulado; caso o pagamento não aconteça, será cobrada uma multa de R$1,00 por dia de atraso. Após 30 dias de atraso, o item será repassado sem direito a reembolso.</li>
            <li>Caso a CEG seja cancelada antes do pagamento para o seller, todos receberão o reembolso. Caso o item já tenha sido pago, porém a CEG foi cancelada por algum motivo, o reembolso acontecerá depois que eu receber o reembolso total da seller/loja.</li>
            <li>Não tenho controle sobre a Receita Federal e o que ela vai decidir sobre as taxas e entrada das caixas; tenha isso em mente sempre que entrar numa CEG internacional.</li>
            <li>Atualizações acontecem no grupo específico da CEG ou caixa; qualquer dúvida deve ser tratada diretamente no meu privado.</li>
          </ul>
        </div>

        <div className="menu-card">
          <h4>Envios, Fretes e Embalagens</h4>
          <ul>
            <li>Frete internacional só está incluso se informado no anúncio. Para photocards geralmente é por volta de R$1~R$7 por item. Itens maiores terão o frete calculado de acordo com o peso e tamanho do item.</li>
            <li>O prazo de envio é de 30 dias corridos após o item chegar na minha casa, podendo variar devido a situações pessoais. Tudo será comunicado.</li>
            <li>Não sou responsável por remessas perdidas, avariadas ou atrasadas pelos Correios.</li>
            <li>O endereço será impresso com base na sua resposta do formulário de endereços. Leia e preencha com muita atenção: qualquer erro, problema, extravio ou atraso no envio por conta de informações incorretas não será de minha responsabilidade. Por conta da quantidade de envios, eu <b>NÃO</b> confirmo endereços no privado, e não irei me responsabilizar por erros de sua parte.</li>
            <li>Em caso de CEGs, o envio nacional deve ser solicitado em até 60 dias corridos após o aviso no grupo. Após o prazo, será cobrada uma taxa de R$1,00 por dia por item. Caso o pedido não seja feito após 30 dias, o item é considerado abandonado e farei a venda do mesmo.</li>
            <li>Reembolso por eventuais avarias ocasionadas por descuido meu só será realizado após verificação de vídeo do unboxing; caso não tenha vídeo, o reembolso não será feito (sem vídeo, sem reembolso). A embalagem é feita com sleeve, num sanduíche de papel paraná. Posso colocar mais de um photocard por sleeve e não uso toploaders.</li>
            <li>Os envios são feitos somente via SuperFrete, sem uso de transportadora. Caso o frete para a sua região fique muito caro, podemos conversar a respeito.</li>
          </ul>
        </div>
      </div>

      <div className="menu-grid cols-2">
        <div className="menu-card">
          <h4>Poca Market</h4>
          <ul>
            <li>Para pesquisar e escolher seus cards, basta acessar o site: <a href="https://pocamarket.com" target="_blank" rel="noopener noreferrer">pocamarket.com</a>.</li>
            <li>São permitidos cards de todos os grupos e idols.</li>
            <li>Para pedir, envie o link do card (ou cards) desejados no meu privado; o valor seguirá o câmbio do dia. Você pode checar o valor pelo Wise.</li>
            <li>Assim que eu confirmar o valor do item e você concordar, você está dando claim no card, portanto verifique o preço corretamente.</li>
            <li>Após o fechamento da caixa, o envio é feito da seguinte forma: Pocamarket → Warehouse → Brasil.</li>
            <li>O envio para a warehouse é realizado para que eu possa ter controle da declaração e assim diminuir possíveis taxas.</li>
          </ul>
        </div>

        <div className="menu-card">
          <h4>Caixa KR &amp; Bunjang</h4>
          <ul>
            <li>Monte sua wishlist com os cards, especifique o grupo, idol e era, informando se é regular/pob/merch e o valor máximo que você pagaria.</li>
            <li>O valor será cotado com o câmbio atual da moeda + taxas da proxy.</li>
            <li>Para pedir, envie a wishlist no meu privado; eu vou procurar os cards e te avisar quando achar um deles.</li>
            <li>O envio da wishlist não configura em claim, portanto seu card só será comprado após eu encontrá-lo e você realizar o pagamento.</li>
            <li>Após o fechamento da caixa, o envio é feito da seguinte forma: seller → warehouse → Brasil.</li>
          </ul>
        </div>
      </div>
    </>
  );
}
