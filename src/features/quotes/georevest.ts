import letterhead from '@/assets/georevest/timbrado.jpg';
import clientsShowcase from '@/assets/georevest/clientes-atendidos.jpg';
import r12Lower from '@/assets/georevest/reservatorio-12-inferior.jpg';
import r12Upper from '@/assets/georevest/reservatorio-12-superior.jpg';
import r4Lower from '@/assets/georevest/reservatorio-4-inferior.jpg';
import r4Upper from '@/assets/georevest/reservatorio-4-superior.jpg';
import type { ClientFiscal } from '@/features/invoices/data';
import type { QuoteItem, Terms } from './data';

/** Identidade e dados fixos do modelo de proposta Georevest (papel timbrado). */
export const company = {
  name: 'Georevest',
  city: 'Atibaia',
  letterhead,
  clientsShowcase,
  footer: ['Telefone: (11) 4417 - 4417', 'Rod. Fernão dias, Km 44 Sul, Atibaia - SP', 'www.georevest.com.br'],
  contacts: [
    { name: 'Eng. Oscar Kameda', role: 'Coordenador de projetos', phone: '(11) 9 3363 - 3989', email: 'o.kameda@georevest.com.br' },
    { name: 'Eng. Gabriel Mota', role: 'Coordenador de projetos', phone: '(11) 9 3363 - 2889', email: 'g.mota@georevest.com.br' },
  ],
  bank: ['Banco do Brasil 001', 'Ag. 0415 Cc. 52124-8', 'Chave Pix: 07.602.753/0001-16', 'Fone da agência: (11) 4003 - 3001, Gerente Félix'],
};

export const georevestTerms: Terms = {
  payment: 'Entrada de 30% + 03 parcelas',
  delivery: 'Produção da Manta Engenheirada em fábrica: 20 dias por reservatório, contados a partir da data de medição. Instalação na obra: 01 dia por reservatório (dias úteis, em horário comercial)',
  warranty: '05 anos, de acordo com as Normas Técnicas da ABNT para impermeabilização',
  validity: '10 dias a partir da data de seu envio via e-mail pela Georevest',
};

/** Rótulos e ordem das condições no formato carta (parágrafos). */
export const letterTermLabels: Record<keyof Terms, string> = { payment: 'Condição de pagamento', delivery: 'Prazo de entrega', warranty: 'Garantia', validity: 'Validade da proposta' };
export const letterTermOrder: (keyof Terms)[] = ['payment', 'delivery', 'warranty', 'validity'];

/** Itens do modelo de referência. Partes da descrição separadas por " · " viram linhas no cartão. */
export const georevestCatalog: QuoteItem[] = [
  { description: 'Blocos de 12 Andares · Reservatórios Inferiores', details: 'Área de Manta Engenheirada ATO 800: 34,77 m²', note: '(Valor por reservatório)', qty: 1, unit: 23197.77, measure: 'UN', image: r12Lower },
  { description: 'Blocos de 12 Andares · Reservatórios Superiores', details: 'Área de Manta Engenheirada ATO 800: 29,98 m²', note: '(Valor por reservatório)', qty: 1, unit: 20561.73, measure: 'UN', image: r12Upper },
  { description: 'Blocos de 4 Andares · Reservatórios Inferiores', details: 'Área de Manta Engenheirada ATO 800: 17,61 m²', note: '(Valor por reservatório)', qty: 1, unit: 13754.28, measure: 'UN', image: r4Lower },
  { description: 'Blocos de 4 Andares · Reservatórios Superiores', details: 'Área de Manta Engenheirada ATO 800: 12,91 m²', note: '(Valor por reservatório)', qty: 1, unit: 11167.77, measure: 'UN', image: r4Upper },
];

export const titleLines = (description: string) => description.split(' · ').map(s => s.trim()).filter(Boolean);

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
/** "2026-10-09" → "09 de Outubro de 2026" (formato da proposta). */
export function longDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return '';
  return `${m[3]} de ${months[Number(m[2]) - 1] ?? ''} de ${m[1]}`;
}

/** Monta "Rua, 175 - Bairro, Cidade - UF, CEP" apenas com as partes cadastradas. */
export function formatAddress(f?: Partial<ClientFiscal>): string {
  if (!f?.address) return '';
  let street = f.address;
  if (f.number) street += `, ${f.number}`;
  if (f.complement) street += ` ${f.complement}`;
  if (f.neighborhood) street += ` - ${f.neighborhood}`;
  const city = [f.city, f.uf].filter(Boolean).join(' - ');
  return [street, city, f.cep].filter(Boolean).join(', ');
}

const mail = (e: string) => `<a href="mailto:${e}">${e}</a>`;

/** Conteúdos padrão dos blocos de texto do modelo. */
export const templateHtml = {
  contacts: `<p><strong>Contato Georevest</strong></p>${company.contacts.map(c => `<p>${c.name} - ${c.role}<br>Telefone: ${c.phone}<br>e-mail: ${mail(c.email)}</p>`).join('')}`,
  clientsTitle: '<h3>Clientes Atendidos</h3>',
  technicalTitle: '<h3>Proposta Técnica.</h3><h3>Manta Engenheirada ATO 800</h3>',
  technical: '<p>Manta Engenheirada é um Georevestimento em PVC Atóxico com 0,80mm de espessura. Com esse material se industrializa um revestimento no formato e nas dimensões do reservatório. Esse serviço de industrialização é feito em fábrica usando sistema de solda eletrônica, a Manta Engenheirada vai pronta para o local de instalação.</p><p>Previamente à instalação da Manta Engenheirada, será instalado geotêxtil não-tecido 300g/m² em toda a extensão do fundo do reservatório.</p><p>A Manta Engenheirada possui em sua parte superior suportes em PVC dispostos ao longo do perímetro superior (PAT. REQ.). Os suportes são ancorados diretamente às estruturas do reservatório utilizando buchas expansivas em nylon e fixadores em aço inox 304. A conexão da Manta Engenheirada aos tubos das prumadas hidráulicas é feita através de mangotes sobrepostos à parede externa dos tubos, que devem estar íntegros, isentos de oxidação, roscas e flanges, projetando-se para o interior do reservatório por uma extensão mínima de 100mm, distantes uns dos outros e das arestas de paredes e fundo a no mínimo 100mm. Os mangotes são fixados aos tubos hidráulicos utilizando abraçadeiras em aço inox 304.</p>',
  obligations: '<h4>Obrigações.</h4><h4>Obrigações da Contratada:</h4><ul><li>Remoção dos resíduos e qualquer outra sujeira decorrente do serviço.</li><li>Fornecer todos os materiais consumíveis.</li><li>Fornecer todos os materiais de aplicação.</li><li>Fornecer os certificados de potabilidade dos materiais.</li><li>Fornecer Munck/Guindaste para içamento do material se necessário.</li><li>Todos os colaboradores devem ter treinamentos válidos em NR 33 (Espaço Confinado).</li><li>Todos os colaboradores devem ter treinamentos válidos em NR 35 (Trabalho em altura).</li></ul><h4>Obrigações da Contratante:</h4><ul><li>Entregar todas as obras civis, elétricas e hidráulicas necessárias ao adequado funcionamento de todo o sistema.</li><li>Fornecimento de Ponto Energia Elétrica.</li><li>Prover as liberações e condições para a execução dos trabalhos.</li><li>Fornecer infraestrutura de segurança do trabalho.</li><li>Garantir que o reservatório esteja esgotado nas datas solicitadas pela contratada. Caso contrário, serão aplicáveis cobranças adicionais referentes aos custos de mobilização e desmobilização da equipe, bem como diárias improdutivas.</li></ul>',
  commercialTitle: '<h3>Proposta Comercial.</h3>',
  commercialIntro: '<p>Manta Engenheirada ATO 800 (preço com base nas medidas fornecidas), mão de obra e materiais para a instalação com todos os equipamentos necessários:</p>',
  bank: `<p><strong>Referências Bancárias:</strong></p>${company.bank.map(l => `<p>${l}</p>`).join('')}`,
  signLeft: `<p>Atenciosamente,</p><p>${company.contacts[0]!.name}</p>`,
  signRight: `<p>${company.contacts[0]!.phone}</p><p>${mail(company.contacts[0]!.email)}</p>`,
};
