---
title: 21. Pointer Arithmetic
---

## commit log

```plaintext
Make pointer arithmetic work
```

在前一个commit中，我们要根据一个指针在栈中找下一个数是这么做的：

```c
y = (&x + 8);
```

因为我们给每个数是分配了8个字节，所以在栈中的下一个数的地址，就是x取址之后加8。

但问题在于，我们在C语言中不是这么做的，在C语言中是这样：

```c
int x = 1;
int y = 2;
int z = *(&x+1)// z == 2
```

指针加1是根据这个指针所指的数据的类型来判定的。如果是`int`，那么实际上是加4，如果是long那么实际上是加8。

也就是说，从这个commit开始，我们就要开始引入类型这一概念了。

## 思路

类型是一个很大的话题，我们要新开辟一个系统，这里我们新建一个`type.c`的C文件。

## 头文件

我们现在的类型还比较简单，就两种，一种是int类型，一种是指针类型，我们暂时还不去考虑每种类型的长度，现在就假定它们都是8字节，包括int。我们新开创一个`enum TypeKind`和`struct Type`。

```c
typedef struct Type Type;

typedef enum {
  TY_INT,
  TY_PTR,
} TypeKind;

struct Type {
  TypeKind kind;
  Type *base;
}
```

稍微解释一下这里的`Type *base`，就是如果Type是一个`TY_PTR`的话，那么我们要通过这个字段知道它指向了一个什么类型。

另外注意一下，这个类型分析，不是仅仅分析变量的，举个例子：

```c
int x = 1;
int y = 2;
float z = x + y;
```

在这个地方，C编译器会分析出x+y这个节点的类型是一个int，接下来因为赋值给了一个float，因此会做一个类型转换。

类型分析是对所有的node都要做分析，因此对于AST中的node，我们添加一个field。

```c
struct Node {
  /*  other fields*/
  Type *ty;
  /*  other fields*/
}
```

并声明一个新的`add_type`函数

```c
void add_type(Node *node);
```

除此之外，再添加一个`is_integer`函数，用来指示一个node是整数还是指针，当然传进的参数还是Type。

```c
bool is_integer(Type *ty);
```

最后再用一个`ty_int`来控制全局的int类型的node，如果一个node是int类型的，那么它所有的type字段都指向这个`ty_int`。

```c
extern Type *ty_int;
```

这里有个问题，就是我们为什么不把Node里面的Type设定为一个TypeKind，而是设定为一个type的指针？这个可能与`add_type`有关，方便我们对已经定了type的node直接做返回处理。

## type.c

我们把前面在头文件里面定义的函数都实现完成。

```c
Type *ty_int = &(Type){TY_INT};

bool is_integer(Type *ty) {
  return ty->kind == TY_INT;
}

// 下面的函数为了实现指针类型
Type *pointer_to(Type *base) {
  Type *ty = calloc(1, sizeof(Type));
  ty->kind = TY_PTR;
  ty->base = base;
  return ty; 
}
```

然后我们来实现`add_type`这个函数，这个函数用来递归地遍历node的所有子节点，然后根据子节点的类型来推断当前节点的类型。

```c
void add_type(Node *node) {
  if (!node || node->ty)
    return ;
  // other code
}
```

如果当前节点为空，或者当前节点已经被赋予了类型，那么直接返回。

```c
void add_type(Node *node) {
  // other code
  add_type(node->lhs);
  add_type(node->rhs);
  add_type(node->cond);
  add_type(node->then);
  add_type(node->els);
  add_type(node->init);
  add_type(node->inc);

  for (Node *n = node->body; n; n = n->next)
    add_type(n);
  // other code
}
```

对Node中所有的节点，都赋上类型。

```c
void add_type(Node *node) {
  // other code
  switch (node->kind) {
  case ND_ADD:
  case ND_SUB:
  case ND_MUL:
  case ND_DIV:
  case ND_NEG:
  case ND_ASSIGN:
    node->ty = node->lhs->ty;
    return;
  case ND_EQ:
  case ND_NE:
  case ND_LT:
  case ND_LE:
  case ND_VAR:
  case ND_NUM:
    node->ty = ty_int;
    return;
  case ND_ADDR:    // 如果是取地址，那么返回一个PTR，这个PTR指向一个int（当前情况下）
    node->ty = pointer_to(node->lhs->ty);
    return;
  case ND_DEREF:   // 如果是解引用，注意解引用的对象可能不是一个指针，其实也可以是一个int
    if (node->lhs->ty->kind == TY_PTR)  // 如果是指针的话，返回其所指的类型
      node->ty = node->lhs->ty->base;
    else               // 如果不是一个指针，返回int，其实这里，不管怎么样，都是返回int
      node->ty = ty_int;
    return;
  }
}
```

最后对节点做类型推断。

## Parser

然后我们就可以对本次commit要解决的问题做处理了。

原先我们的add函数，扫描到一个`+`就直接调用`new_binary`，现在不能这样了，我们现在需要判断类型。我们现在写一个`new_add`函数，当类型是指针和数时要做不同的操作，当然也还需要一个`new_sub`函数。

```c
static Node *add(Token **rest, Token *tok) {
  Node *node = mul(&tok, tok);

  for (;;) {
    Token *start = tok;

    if (equal(tok, "+")) {
      node = new_add(node, mul(&tok, tok->next), start);
      continue;
    }   

    if (equal(tok, "-")) {
      node = new_sub(node, mul(&tok, tok->next), start);
      continue;
    }   

    *rest = tok;
    return node;
  }
}
```

然后我们来实现这个`new_add`和`new_sub`。

```c
static Node *new_add(Node *lhs, Node *rhs, Token *tok) {
  add_type(lhs);
  add_type(rhs);

  // 如果左右操作数都是int的话，那么直接调用new_binary就好了。
  if (is_integer(lhs->ty) && is_integer(rhs->ty))
    return new_binary(ND_ADD, lhs, rhs, tok);
  
  // 注意，不允许ptr-ptr这种情况存在
  if (!lhs->ty->base && rhs->ty->base) 
    error_tok(tok, "invalid operands");
  
  // 如果是int+ptr或者ptr+int，那么需要做特殊处理
  // 我们只处理ptr+int, 如果是int+ptr，那么我们把左右操作数翻转一下
  if (!lhs->ty->base && rhs->ty->base) {
    Node *tmp = lhs;
    lhs = rhs;
    rhs = tmp;
  }
  // 对于ptr+int的情况，其实我们只需要把这个int给拓展成一个mul就好了
  // 其实就相当于插入一条mul执行，这里+1就会变成+8
  rhs = new_binary(ND_MUL, rhs, new_num(8, tok), tok);
  return new_binary(ND_ADD, lhs, rhs, tok);
}
```

然后是`new_sub`，注意一下这里我们是不允许`int - ptr`这种表达式的，但是`ptr - ptr`是ok的。

```c
static Node *new_sub(Node *lhs, Node *rhs, Token *tok) {
  add_type(lhs);
  add_type(rhs);

  // 如果左右操作数都是int的话，那么直接调用new_binary就好了。
  if (is_integer(lhs->ty) && is_integer(rhs->ty))
    return new_binary(ND_SUB, lhs, rhs, tok);

  // 处理对于ptr - int的情况，把int拓展成一个mul
  if (lhs->ty->base && is_integer(rhs->ty)) {
    rhs = new_binary(ND_MUL, rhs, new_num(8, tok), tok);
    add_type(rhs);
    Node *node = new_binary(ND_SUB, lhs, rhs, tok);
    node->ty = lhs->ty;
    return node;
  }

  // 然后处理ptr - ptr的情况，此时当前node是一个int
  if (lhs->ty->base && rhs->ty->base) {
    Node *node = new_binary(ND_SUB, lhs, rhs, tok);
    node->ty = ty_int;
    return new_binary(ND_DIV, node, new_num(8, tok), tok);
  }
  // 对于其它情况，也就是int - ptr，要进行报错。
  error_tok(tok, "invalid operands");
}

```

除此之外，对于顶上的节点`compound_stmt`，要应用一下`add_type`。

```c
static Node *compound_stmt(Token **rest, Token *tok) {
  Node *node = new_node(ND_BLOCK, tok);

  Node head = {}; 
  Node *cur = &head;
  while (!equal(tok, "}")) {
    cur = cur->next = stmt(&tok, tok);
    add_type(cur);    // <-----------
  }

  node->body = head.next;
  *rest = tok->next;
  return node;
}
```

## test.sh

最后把原先的测例稍作修改：

```bash
assert 3 '{ x=3; return *&x; }'
assert 3 '{ x=3; y=&x; z=&y; return **z; }'
assert 5 '{ x=3; y=5; return *(&x+1); }'
assert 3 '{ x=3; y=5; return *(&y-1); }'
assert 5 '{ x=3; y=5; return *(&x-(-1)); }'
assert 5 '{ x=3; y=&x; *y=5; return x; }'
assert 7 '{ x=3; y=5; *(&x+1)=7; return y; }'
assert 7 '{ x=3; y=5; *(&y-2+1)=7; return x; }'
assert 5 '{ x=3; return (&x+2)-&x+3; }'
```

‍
