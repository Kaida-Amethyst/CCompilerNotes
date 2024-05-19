---
title: 15. If Statement
---

## commit log

```plaintext
Add "if" statement
```

## 范式

```plaintext
IFStmt : "if" "(" expr ")" stmt ("else" stmt ) ?

stmt : "return" expr ";"
     | expr ";" stmt
     | "{" stmt "}"
     | IFStmt
     |
     ;
```

## 思路

我们把一个Node做一个扩展，对于ifnode有三个子node，分别是cond，then，和else。在然后再codegen阶段，要知道cond是一个expr，对cond做完代码生成之后，它是有值放在rax里面的，然后我们将其与0做比较，生成一个cmp语句。对于if的两个分支，分别做不同的跳转策略。

## chibicc.h

添加新的节点类型：

```c
typedef enum {
  /*  other node types*/
  ND_IF,
  /*  other node types*/
}

struct Node {
  NodeKind kind;
  Node *next;
  Node *lhs;
  Node * rhs;
  // "if" statement  // <-------
  Node *cond;        // <-------
  Node *then;        // <-------
  Node *els;         // <-------

  // Block
  Node *body
  Obj *var;  // Used if kind == ND_VAR;
  int val;
}
```

## Lexer

我们现在有了好几个keyword了，我们需要修改`convert_keywords`这个函数，这里添加一个`is_keyword`函数：

```c
static bool is_keyword(Token *tok) {
  static char *kw[] = {"return", "if", "else"};

  for (int i = 0; i < sizeof(kw) / sizeof(*kw); i++)
    if (equal(tok, kw[i]))
      return true;
  return false;
}
```

然后：

```c
static void convert_keywords(Token *tok) {
  for (Token *t = tok; t->kind != TK_EOF; t = t->next)
    if (is_keyword(t))
      t->kind = TK_KEYWORD;
}
```

## Parser

按照之前的分析，这个if语句是stmt的一种，因此我们这里对stmt函数做修改。

```c
static Node *stmt (Token **rest, Token *tok) {
  if (equal(tok, "return")) {
    Node *node = new_unary(ND_RETURN, expr(&tok, tok->next));
    *rest = skip(tok, ";");
    return node;
  }

  if (equal(tok, "if")) {
    Node *node = new_node(ND_IF);
    tok = skip(tok->next, "(");
    node->cond = expr(&tok, tok);
    tok = skip(tok, ")");
    node->then = stmt(&tok, tok);
    if (equal(tok, "else")) 
      node->els = stmt(&tok, tok->next);
    *rest = tok;
    return node;
  }

  if (equal(tok, "{")) 
    return compound_stmt(rest, tok->next);
  return expr_stmt;
}
```

## codegen

主要是修改gen_stmt函数，这里注意一个问题，就是我们可能不止一个if语句，我们需要区分每一个if语句。我们可以用一个整数来区分。

我们写一个count，其中内置一个static变量。

```c
static int count(void) {
  static int i = 1;
  return i++;
}
```

这里变量就用来标记我们每一个if语句。

```c
static void gen_stmt(Node *node) {
  switch (node->kind) {
    case ND_IF: {
      int c = count();
      gen_expr(node->cond);
      printf("  cmp $0, %%rax\n");
      printf("  je  .L.else.%d\n", c);
      gen_stmt(node->then);
      printf("  jmp .L.end.%d\n", c);
      printf(".L.else.%d:\n", c);
      if (node->els) {
        gen_stmt(node->els);
      }
      printf(".L.end.%d:\n", c);
      return ;
    }

  }
  /*  other cases*/

  error("invalid statement");
}
```

## test.sh

添加如下的测例：

```bash
assert 3 '{ if (0) return 2; return 3; }'
assert 3 '{ if (1-1) return 2; return 3; }'
assert 2 '{ if (1) return 2; return 3; }'
assert 2 '{ if (2-1) return 2; return 3; }'
assert 4 '{ if (0) { 1; 2; return 3; } else { return 4; } }'
assert 3 '{ if (1) { 1; 2; return 3; } else { return 4; } }'
```

‍
