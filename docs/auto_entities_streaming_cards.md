# Auto-Entities Streaming Cards Cheat Sheet

This project uses `custom:auto-entities` to render dynamic button-card lists. The renderer expects a JSON array streamed directly from Jinja, so concatenating lists with namespaces fails. Follow the pattern below whenever you need to emit grouped cards with a fallback.

```yaml
card:
  type: custom:auto-entities
  card_param: cards
  filter:
    include:
      - domain: sensor
        name: Example
  card:
    type: custom:mod-card
    card_mod:
      style: |
        ha-card { padding: 8px 12px; }
    card:
      type: custom:auto-entities
      card_param: cards
      filter:
        include:
          - domain: todo
            name: Example
      card:
        type: custom:button-card
        template: chore_container
        variables:
          auto_entities_render: |
            {% set fallback = {
              'type': 'markdown',
              'content': '*No items.*'
            } %}
            {% set buckets = ['Morning', 'Afternoon'] %}
            {% set rendered = namespace(value=False) %}
            [
              {{ header | tojson }}
              {% for bucket in buckets %}
                {% set bucket_state = namespace(rendered=False) %}
                {% for task in tasks if task.bucket == bucket %}
                  {% if not bucket_state.rendered %}
                    {% set section = {
                      'type': 'custom:button-card',
                      'template': 'chore_section_header',
                      'variables': {
                        'label': bucket
                      }
                    } %}
                    , {{ section | tojson }}
                    {% set bucket_state.rendered = True %}
                  {% endif %}
                  {% set card = {
                    'type': 'custom:button-card',
                    'template': 'chore_task',
                    'name': task.name
                  } %}
                  , {{ card | tojson }}
                  {% set rendered.value = True %}
                {% endfor %}
              {% endfor %}
              {% if not rendered.value %}
                , {{ fallback | tojson }}
              {% endif %}
            ]
```

Key rules:

- Always start the array with any static cards (such as a header) and stream commas before subsequent items.
- Keep a namespace flag (`rendered.value`) to decide whether to append the fallback element at the end.
- Use per-group namespace flags (`bucket_state.rendered`) for section headers so each header appears only once.
- Convert every structured card to JSON with `| tojson` before streaming.

This mirrors the pattern in `Dashboards/chores/cards/profiles_family.yaml` and aligns with `test06_stream_button_cards.yaml` in `Dashboards/chores/tests/`.
