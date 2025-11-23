import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface NavLink {
  readonly id: string;
  readonly label: string;
}

interface PageSection {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly highlights: readonly string[];
  readonly label?: string;
  readonly badge?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class AppComponent {
  readonly navLinks: readonly NavLink[] = [
    { id: 'home', label: 'Home' },
    { id: 'programacao', label: 'Programação' },
    { id: 'briefing', label: 'Briefing' },
    { id: 'pesquisa', label: 'Pesquisa' },
    { id: 'estrategia', label: 'Estratégia' },
    { id: 'ideacao', label: 'Ideação' },
    { id: 'ui-design', label: 'UI Design' },
    { id: 'prototipo', label: 'Protótipo' },
    { id: 'apresentacao', label: 'Apresentação' },
    { id: 'entrega', label: 'Entrega' },
  ];

  readonly sections: readonly PageSection[] = [
    {
      id: 'programacao',
      title: 'Programação',
      summary: 'Planejamento macro do ciclo de produto com marcos, responsáveis e entregáveis claros.',
      highlights: [
        'Linha do tempo com datas de cada etapa e checkpoints semanais.',
        'Rituais definidos (kickoff, alinhamentos, revisões de protótipo e checkpoint executivo).',
        'Critérios de saída explícitos para avançar para a próxima fase.',
      ],
      badge: 'Sprint 0',
    },
    {
      id: 'briefing',
      title: 'Briefing',
      summary: 'Contexto de negócio, problema, hipóteses e sucesso esperado organizados em um canvas conciso.',
      highlights: [
        'Contexto de produto, objetivo de negócio e metas de sucesso.',
        'Audiência-alvo, restrições técnicas e dependências identificadas.',
        'Perguntas abertas e riscos mapeados para guiar a pesquisa.',
      ],
      badge: 'Contexto',
    },
    {
      id: 'pesquisa',
      title: 'Pesquisa',
      summary: 'Descoberta estruturada com entrevistas, desk research e análise competitiva.',
      highlights: [
        'Roteiros de entrevista e critérios de recrutamento definidos.',
        'Matriz de achados priorizados por impacto e confiança.',
        'Insights traduzidos em necessidades e dores de usuário.',
      ],
      badge: 'Discovery',
    },
    {
      id: 'estrategia',
      title: 'Estratégia',
      summary: 'Direcionamento claro: visão do produto, princípios de design e proposta de valor.',
      highlights: [
        'Canvas de proposta de valor e mapa de jornada crítica.',
        'Princípios de experiência alinhados à identidade da marca.',
        'Métricas norteadoras (North Star) e indicadores de adoção.',
      ],
      badge: 'Visão',
    },
    {
      id: 'ideacao',
      title: 'Ideação',
      summary: 'Exploração colaborativa com sketches, storyboards e fluxos alternativos.',
      highlights: [
        'Workshops rápidos (crazy 8s, lightning demos) para gerar volume.',
        'Fluxos prioritários mapeados em low-fi para teste inicial.',
        'Critérios de priorização alinhados a impacto x esforço.',
      ],
      badge: 'Exploração',
    },
    {
      id: 'ui-design',
      title: 'UI Design',
      summary: 'Aplicação do sistema visual com consistência Andes/Mercado Livre.',
      highlights: [
        'Componentes reutilizáveis (cards, navegação, CTA) ancorados no design system.',
        'Grade responsiva e tokens de cor tipográficos alinhados ao padrão ML.',
        'Estados e microinterações especificados para desenvolvimento.',
      ],
      badge: 'Design System',
    },
    {
      id: 'prototipo',
      title: 'Protótipo',
      summary: 'Fluxos navegáveis de alta fidelidade para validação rápida com usuários e stakeholders.',
      highlights: [
        'Navegação clara entre telas-chave e feedback visual consistente.',
        'Cenários de teste definidos (tarefas críticas e casos de erro).',
        'Checklist de acessibilidade aplicado nos componentes interativos.',
      ],
      badge: 'Validação',
    },
    {
      id: 'apresentacao',
      title: 'Apresentação',
      summary: 'Narrativa estruturada para comunicar decisões, hipóteses validadas e próximos passos.',
      highlights: [
        'Storytelling com problema, solução proposta e impacto esperado.',
        'Demonstração guiada do protótipo com métricas de sucesso.',
        'Próximos passos e riscos mitigados destacados para liderança.',
      ],
      badge: 'Stakeholders',
    },
    {
      id: 'entrega',
      title: 'Entrega',
      summary: 'Pacote final para desenvolvimento com especificações claras e documentação rastreável.',
      highlights: [
        'Arquivos organizados por fluxo, com versões congeladas para handoff.',
        'Guia de implementação com tokens, espaçamentos e estados.',
        'Checklist de QA funcional e visual alinhado ao time de engenharia.',
      ],
      badge: 'Handoff',
    },
  ];
}
