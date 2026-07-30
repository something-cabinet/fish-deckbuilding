extends Panel

@export var log_label: RichTextLabel

func append_text(text: String) -> void:
	var current = log_label.text
	var lines = current.split("\n")
	lines.push_back(text)
	if lines.size() > 11:
		lines.remove_at(0)
	log_label.text = "\n".join(lines)
	var count = log_label.get_paragraph_count()
	if count > 0:
		log_label.scroll_to_line(count - 1)