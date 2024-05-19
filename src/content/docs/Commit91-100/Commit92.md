---
title: 92. Switch Case
---

## commit log

```plaintext
Add switch-case
```

添加switch-case语法。

## Lexer

```c
static bool is_keyword(Token *tok) {
  static char *kw[] = {
     "return", "if", "else", "for", "while", "int", "sizeof", "char",
     "struct", "union", "short", "long", "void", "typedef", "_Bool",
     "enum", "static", "goto", "break", "continue", "switch", "case",
     "default",
  };
  // ...
}
```

## Parser

```c
// chibicc.h
typedef enum {
  // ...
  ND_SWITCH,
  ND_CASE,
} NodeKind;

struct Node {
  // other fields
  // switch-cases
  Node *case_next;
  Node *default_case;
};

// parser.c
static Node *current_switch;

static Node *stmt(Token **rest, Token *tok) {
  // other cases
  if (equal(tok, "switch")) {
    Node *node = new_node(ND_SWITCH, tok);
    tok = skip(tok->next, "(");
    node->cond = expr(&tok, tok);
    tok = skip(tok, ")");
    Node *sw = current_switch;
    current_switch = node;
    char *brk = brk_label;
    brk_label = node->brk_label = new_unique_name();
    node->then = stmt(rest, tok);
    current_switch = sw;
    brk_label = brk;
    return node;
  }
  // 暂时不支持枚举
  if (equal(tok, "case")) {
    if (!current_switch)
      error_tok(tok, "stray case");
    int val = get_number(tok->next);
    Node *node = new_node(ND_CASE, tok);
    tok = skip(tok->next->next, ":");
    node->label = new_unique_name();
    node->lhs = stmt(rest, tok);
    node->val = val; 
    node->case_next = curret_switch->case_next;
    current_swicth->case_next = node;
    return node;
  }

  if (equal(tok, "default")) {
    if (!current_switch)
      error_tok(tok, "stray default");
    Node *node = new_node(ND_CASE, tok);
    tok = skip(tok->next, ":");
    node->label = new_unique_name();
    node->lhs = stmt(rest, tok);
    current_switch->default_case = node;
    return node;
  }
  // ...
}
```

## Codegen

```c
static void gen_stmt(Node *node) {
  switch(node->kind) {
  case ND_SWITCH:
    gen_expr(node->cond);
    for(Node *n = node->case_next; n; n->case_next) {
      char *ref = (node->cond->ty->size == 8) ? "%rax" : "%eax";
      println("  cmp $%ld, %s", n->val, reg);
      println("  je %s", n->label);
    }
    if (node->default_case)
      println("  jmp %s", node->default_case->label);
    println("  jmp %s", node->brk_label);
    gen_stmt(node->then);
    println("%s:", node->brk_label);
    return ;
  case ND_CASE:
    println("%s:", node->label);
    gen_stmt(node->lhs);
    return ;
  }
}
```

## test

```c
// control.c
int main() {
  ASSERT(5, ({ int i=0; switch(0) { case 0:i=5;break; case 1:i=6;break; case 2:i=7;break; } i; }));
  ASSERT(6, ({ int i=0; switch(1) { case 0:i=5;break; case 1:i=6;break; case 2:i=7;break; } i; }));
  ASSERT(7, ({ int i=0; switch(2) { case 0:i=5;break; case 1:i=6;break; case 2:i=7;break; } i; }));
  ASSERT(0, ({ int i=0; switch(3) { case 0:i=5;break; case 1:i=6;break; case 2:i=7;break; } i; }));
  ASSERT(5, ({ int i=0; switch(0) { case 0:i=5;break; default:i=7; } i; }));
  ASSERT(7, ({ int i=0; switch(1) { case 0:i=5;break; default:i=7; } i; }));
  ASSERT(2, ({ int i=0; switch(1) { case 0: 0; case 1: 0; case 2: 0; i=2; } i; }));
  ASSERT(0, ({ int i=0; switch(3) { case 0: 0; case 1: 0; case 2: 0; i=2; } i; }));
  ASSERT(3, ({ int i=0; switch(-1) { case 0xffffffff: i=3; break; } i; }));
}
```

‍
