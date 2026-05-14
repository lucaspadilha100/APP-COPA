from sqlalchemy.orm import Session

from .models import AppSetting, Modality

DEFAULT_MODALITIES = [
    {"name": "Futsal Masculino", "kind": "bracket", "icon": "⚽", "phases": "Grupos,Oitavas,Quartas,Semifinal,Final", "order": 1},
    {"name": "Futsal Feminino", "kind": "bracket", "icon": "⚽", "phases": "Grupos,Quartas,Semifinal,Final", "order": 2},
    {"name": "Minicampo Masculino", "kind": "bracket", "icon": "🥅", "phases": "Grupos,Quartas,Semifinal,Final", "order": 3},
    {"name": "Basquete 3x3 Masculino", "kind": "bracket", "icon": "🏀", "phases": "Grupos,Quartas,Semifinal,Final", "order": 4},
    {"name": "Vôlei Masculino", "kind": "bracket", "icon": "🏐", "phases": "Grupos,Quartas,Semifinal,Final", "order": 5},
    {"name": "Vôlei Feminino", "kind": "bracket", "icon": "🏐", "phases": "Grupos,Quartas,Semifinal,Final", "order": 6},
    {"name": "Natação", "kind": "swimming", "icon": "🏊", "phases": "Eliminatória,Semifinal,Final", "order": 7},
]

DEFAULT_SETTINGS = {
    "team_name": "São Mateus Moreira",
    "webhook_url": "",
    "group1_label": "Grupo 1",
    "group1_jid": "",
    "group2_label": "Grupo 2",
    "group2_jid": "",
    "active_group": "1",
    "message_template": (
        "🏆 *Copa São Mateus Moreira*\n"
        "*{modalidade}* — {fase}\n"
        "🗓 {data} às {horario}\n"
        "São Mateus Moreira *{placar_nos}* x *{placar_eles}* {adversario}\n"
        "{status_emoji} {status}"
    ),
    "swim_message_template": (
        "🏊 *Copa São Mateus Moreira* — Natação\n"
        "🏅 *Prova:* {distancia}\n"
        "*{fase}* {bateria}\n"
        "🗓 {data} às {horario}\n"
        "Atleta: *{atleta}*\n"
        "Tempo: *{tempo}*\n"
        "{classificacao}"
    ),
}


def seed_initial_data(db: Session) -> None:
    if db.query(Modality).count() == 0:
        for m in DEFAULT_MODALITIES:
            db.add(Modality(**m))
        db.commit()

    for key, value in DEFAULT_SETTINGS.items():
        if not db.query(AppSetting).filter(AppSetting.key == key).first():
            db.add(AppSetting(key=key, value=value))
    db.commit()
