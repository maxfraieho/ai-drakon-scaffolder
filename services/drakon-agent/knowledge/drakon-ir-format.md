# DRAKON IR Format Reference

DRAKON IR is the intermediate representation used by the drakon-editor widget.

## Mandatory structure
Every diagram MUST have:
- `b0`: entry branch node with branchId 0 and `one` pointer to first action
- `end`: terminal node with type "end"

## Node types

### branch (entry point)
{ "type": "branch", "branchId": 0, "one": "n1" }

### action
{ "type": "action", "content": "Do something", "one": "end" }

### question (conditional / if)
{ "type": "question", "content": "Condition?", "one": "yes_node", "two": "no_node" }
`one` = YES branch (condition true), `two` = NO branch (condition false)

### end
{ "type": "end" }

## Params field
`params` must be a STRING, not an array.

## Rules
- Without b0 with branchId=0 the widget shows only the header, no flowchart
- question.one = YES (condition true), question.two = NO (condition false)
- All paths must eventually reach "end"
