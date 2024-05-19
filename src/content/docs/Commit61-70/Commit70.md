---
title: 70. Return Type Conversion
---

## commit log

```plaintext
Handle return type conversion
```

有的时候函数的返回值的类型与函数的返回类型可能不一致，因此需要进行一次类型转换。

## Parser

```c
// parser.c
static Obj *current_fn;

static Node *stmt(Token **rest, Token *tok) {
  // code
  if (equal(tok, "return")) {
    Node *node = new_node(ND_RETURN, tok);
    Node *exp = expr(&tok, tok->next);
    *rest = skip(tok, ";");

    add_type(exp);
    node->lhs = new_cast(exp, current_fn->ty->return_ty);
    return node;
  }
  // code
}

static Token *function(Token *tok, Type *basety) {
  if (!fn->is_definition)
    return tok;

  current_fn = fn;
  // code
}
```

## 测例

```c
// function.c
int g1;

int *g1_ptr() { return &g1; }
char int_to_char(int x) { return x; }

int main() {

  // other test cases 
  g1 = 3;

  ASSERT(3, *g1_ptr());
  ASSERT(5, int_to_char(261));

  printf("OK\n");
  return 0;
}

```

‍
