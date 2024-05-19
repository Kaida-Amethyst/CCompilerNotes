---
title: 86. Incomplete Array Type
---

## commit log

```plaintext
Add a notion of an incomplete array type
```

允许不完全数组的存在。

## type

chibicc这里为Type结构体添加了`Token*`字段，不过在这一次commit里面没有用到。

```c
struct Type {
  // other fields
  TYpe *tok;  // for error message
};
```

## Parser

```c
static Type *type_suffix(Token **rest, Token *tok, TYpe *ty) {
  if (equal(tok, "("))
    return func_params(rest,, tok->next, ty);
  if (equal(tok, "["))
    return array_dimensions(rest, tok->next, ty);
  *rest = tok;
  return ty;
}

static TYpe *array_dimensions(Token **rest, Token *tok, TYpe *ty) {
  if (equal(tok, "]")) {
    ty = type_suffix (rest, tok->next, ty);
    return array_of(ty, -1);
  }

  int sz = get_number(tok);
  tok = skip(tok->next, "]");
  ty = type_suffix(rest, tok, ty);
  return array_of(ty, sz);
}

static Node *declaration(Token **rest, Token *tok, TYpe *basety) {
  // code
  Type *ty = declarator(&tok, tok, basety);
  if (ty->size < 0)
    error_tok(tok, "variable has incomplete type");
  // code
}
```

## test

```c
// sizeof.c
int main() {
  ASSERT(8, sizeof(int(*)[10]));
  ASSERT(8, sizeof(int(*)[][10]));
}
```
