---
title: 95. Constant Expressions
---

## commit log

```plaintext
Add constant expression
```

允许代码中使用常量表达式替代常数。

## Parser

先来添加一个`const_expr`的函数，它会对一个常量表达式进行语法分析，但是注意，这个生成的语法树要在编译阶段就直接生成值，而并非像一般的语法树去生成代码。

```c
static int64_t const_expr(Token **rest, Token *tok);

// Evaluate a given node as a constant expression.
static int64_t eval(Node *node) {
  add_type(node);

  switch (node->kind) {
  case ND_ADD:
    return eval(node->lhs) + eval(node->rhs);
  case ND_SUB:
    return eval(node->lhs) - eval(node->rhs);
  case ND_MUL:
    return eval(node->lhs) * eval(node->rhs);
  case ND_DIV:
    return eval(node->lhs) / eval(node->rhs);
  case ND_NEG:
    return -eval(node->lhs);
  case ND_MOD:
    return eval(node->lhs) % eval(node->rhs);
  case ND_BITAND:
    return eval(node->lhs) & eval(node->rhs);
  case ND_BITOR:
    return eval(node->lhs) | eval(node->rhs);
  case ND_BITXOR:
    return eval(node->lhs) ^ eval(node->rhs);
  case ND_SHL:
    return eval(node->lhs) << eval(node->rhs);
  case ND_SHR:
    return eval(node->lhs) >> eval(node->rhs);
  case ND_EQ:
    return eval(node->lhs) == eval(node->rhs);
  case ND_NE:
    return eval(node->lhs) != eval(node->rhs);
  case ND_LT:
    return eval(node->lhs) < eval(node->rhs);
  case ND_LE:
    return eval(node->lhs) <= eval(node->rhs);
  case ND_COND:
    return eval(node->cond) ? eval(node->then) : eval(node->els);
  case ND_COMMA:
    return eval(node->rhs);
  case ND_NOT:
    return !eval(node->lhs);
  case ND_BITNOT:
    return ~eval(node->lhs);
  case ND_LOGAND:
    return eval(node->lhs) && eval(node->rhs);
  case ND_LOGOR:
    return eval(node->lhs) || eval(node->rhs);
  case ND_CAST:
    if (is_integer(node->ty)) {
      switch (node->ty->size) {
      case 1: return (uint8_t)eval(node->lhs);
      case 2: return (uint16_t)eval(node->lhs);
      case 4: return (uint32_t)eval(node->lhs);
      }
    }
    return eval(node->lhs);
  case ND_NUM:
    return node->val;
  }

  error_tok(node->tok, "not a compile-time constant");
}

static int64_t const_expr(Token **rest, Token *tok) {
  Node *node = conditional(rest, tok);
  return eval(node);
}
```

原先我们的函数`get_number`要弃用，都换成这种`const_expr`，相应地，我们就需要修改原先使用到`get_number`的地方。

```c
static Type* array_dimensions(Token **rest, Token *tok, Type *ty) {
  if (equal(tok, "]")) {
    ty = type_suffix(rest, tok->next, ty);
    return array_of(ty, -1);
  }

  int sz = const_expr(&tok, tok);
  tok = skip(tok, "]");
}

static Type *enum_specifier(Token **rest, Token *tok) {
  /* code */
  // Read an enum-list
  int i = 0;
  int val = 0;
  while(!equal(tok, "}")) {
    if (i++ > 0)
      tok = skip(tok, ",");
    char *name = get_ident(tok);
    tok = tok->next;
    if (equal(tok, "="))
      val = const_expr(&tok, tok->next);
    VarScope *sc = push_scope(name);
    sc->enum_ty = ty;
    sc->enum_val = val++;
  }
  /* code */
}

static Node *stmt(Token **rest, Token *tok) {
  /* code */
  if (equal(tok, "case")) {
    if (!current_switch)
      error_tok(tok, "stray case");

    Node *node = new_node(ND_CASE, tok);
    int val = const_expr(&tok, tok->next);
    tok = skip(tok, ":");
    node->label = new_unique_name();
    node->lhs = stmt(rest, tok);
    node->val = val; 
    node->case_next = current_switch->case_next;
    current_switch->case_next = node;
    return node;
  }
  /* code */
}
```

## test

```c
#include "test.h"

int main() {
  ASSERT(10, ({ enum { ten=1+2+3+4 }; ten; }));
  ASSERT(1, ({ int i=0; switch(3) { case 5-2+0*3: i++; } i; }));
  ASSERT(8, ({ int x[1+1]; sizeof(x); }));
  ASSERT(6, ({ char x[8-2]; sizeof(x); }));
  ASSERT(6, ({ char x[2*3]; sizeof(x); }));
  ASSERT(3, ({ char x[12/4]; sizeof(x); }));
  ASSERT(2, ({ char x[12%10]; sizeof(x); }));
  ASSERT(0b100, ({ char x[0b110&0b101]; sizeof(x); }));
  ASSERT(0b111, ({ char x[0b110|0b101]; sizeof(x); }));
  ASSERT(0b110, ({ char x[0b111^0b001]; sizeof(x); }));
  ASSERT(4, ({ char x[1<<2]; sizeof(x); }));
  ASSERT(2, ({ char x[4>>1]; sizeof(x); }));
  ASSERT(2, ({ char x[(1==1)+1]; sizeof(x); }));
  ASSERT(1, ({ char x[(1!=1)+1]; sizeof(x); }));
  ASSERT(1, ({ char x[(1<1)+1]; sizeof(x); }));
  ASSERT(2, ({ char x[(1<=1)+1]; sizeof(x); }));
  ASSERT(2, ({ char x[1?2:3]; sizeof(x); }));
  ASSERT(3, ({ char x[0?2:3]; sizeof(x); }));
  ASSERT(3, ({ char x[(1,3)]; sizeof(x); }));
  ASSERT(2, ({ char x[!0+1]; sizeof(x); }));
  ASSERT(1, ({ char x[!1+1]; sizeof(x); }));
  ASSERT(2, ({ char x[~-3]; sizeof(x); }));
  ASSERT(2, ({ char x[(5||6)+1]; sizeof(x); }));
  ASSERT(1, ({ char x[(0||0)+1]; sizeof(x); }));
  ASSERT(2, ({ char x[(1&&1)+1]; sizeof(x); }));
  ASSERT(1, ({ char x[(1&&0)+1]; sizeof(x); }));
  ASSERT(3, ({ char x[(int)3]; sizeof(x); }));
  ASSERT(15, ({ char x[(char)0xffffff0f]; sizeof(x); }));
  ASSERT(0x10f, ({ char x[(short)0xffff010f]; sizeof(x); }));
  ASSERT(4, ({ char x[(int)0xfffffffffff+5]; sizeof(x); }));
  ASSERT(8, ({ char x[(int*)0+2]; sizeof(x); }));
  ASSERT(12, ({ char x[(int*)16-1]; sizeof(x); }));
  ASSERT(3, ({ char x[(int*)16-(int*)4]; sizeof(x); }));

  printf("OK\n");
  return 0;
}
```

‍
