---
title: 16. For Loop
---

## commit log

```plaintext
Add "for" stamtement
```

## 范式

```plaintext
FORStmt : "for" "(" (expr-stmt)? ";" (expr)? ";" (stmt)? ")" stmt

expr-stmt : expr ";" expr-stmt
          |
          ;

stmt : "return" expr ";"
     | expr-stmt
     | "{" stmt "}"
     | IFStmt
     | FORStmt
     |
     ;
```

## 思路

跟`if`语句的添加如出一辙，先是添加Node类型，然后添加新的node字段，最后在codegen阶段编排顺序即可。

## chibicc.h

```c
typedef enum {
  /*  other node types*/
  ND_FOR,
  /*  other node types*/
}

struct Node {
  NodeKind kind;
  Node *next;
  Node *lhs;
  Node * rhs;
  // "if" statement
  Node *cond;
  Node *then;
  Node *els;

  // "for" statement
  Node *init;
  Node *inc;

  // Block
  Node *body
  Obj *var;  // Used if kind == ND_VAR;
  int val;
}
```

## Lexer

拓展一下`is_keyword`函数即可。

```c
static bool is_keyword(Token *tok) {
  static char *kw[] = {"return", "if", "else", "for"};
  // other code
}
```

## parser

在stmt函数中添加：

```c
  if (equal(tok, "for")) {
    Node *node = new_node(ND_FOR);
    tok = skip(tok->next, "(");

    node->init = expr_stmt(&tok, tok);

    if (!equal(tok, ";"))
      node->cond = expr(&tok, tok);
    tok = skip(tok, ";");

    if (!equal(tok, ")"))
      node->inc = expr(&tok, tok);
    tok = skip(tok, ")");

    node->then = stmt(rest, tok);
    return node;
  }

```

## Codegen

在`gen_stmt`中添加：

```c
  case ND_FOR: {
    int c = count();
    gen_stmt(node->init);
    printf(".L.begin.%d:\n", c); 
    if (node->cond) {
      gen_expr(node->cond);
      printf("  cmp $0, %%rax\n");
      printf("  je  .L.end.%d\n", c); 
    }   
    gen_stmt(node->then);
    if (node->inc)
      gen_expr(node->inc);
    printf("  jmp .L.begin.%d\n", c); 
    printf(".L.end.%d:\n", c); 
    return;
  }
```

## test.sh

最后添加新的测例。

```bash
assert 55 '{ i=0; j=0; for (i=0; i<=10; i=i+1) j=i+j; return j; }'
assert 3 '{ for (;;) {return 3;} return 5; }'
```

‍
