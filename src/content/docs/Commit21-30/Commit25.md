---
title: 25. Zero Arity Function Definitions
---

## commit log

```plaintext
Support zero-arity function definition
```

支持无参数函数定义。

## 头文件

一旦引入函数，那么我们的一个Ident就多了函数这种类型。因此我们首先需要添加一种函数类型的Type。另外，我们现在不止一个Function了，因此我们原有的Function结构体需要添加name和next字段。

```c
typedef enum {
  TY_INT,
  TY_PTR,
  TY_FUNC,     // <-------
} TypeKind;

struct Type {
  /*  other fields  */
  // Function type
  Type *return_ty;  
};

struct Function {
  Function *next;      // <----------
  char *name;          // <----------
  Node *body;
  Obj *locals;
  int stack_size;
};
```

## Type

我们新添加一种初始化type的方法：

```c
Type *func_type(Type *return_ty) {
  Type *ty = calloc(1, sizeof(Type));
  ty->kind = TY_FUNC;
  ty->return_ty = return_ty;
  return ty; 
}
```

## Parser

一个函数定义的范式是这样：

```plaintext
Function-definition : Type Ident "(" ")" "{" stmts "}"
```

依据此，我们来写出解析函数定义的函数：

```c
// 注意我们的函数可以返回类似于int ***这样的类型
static Function *function(Token **rest, Token *tok) {
  Type *ty = declspec(&tok, tok);
  ty = declarator(&tok, tok, ty);

  locals = NULL;
  Fucntion *fn = calloc(1, sizeof(Fucntion));
  fn->name = get_ident(ty->name);
  tok = skip(tok, "{");
  fn->body = compound_stmt(rest, tok);
  fn->locals = locals;
  return  fn;
}
```

注意这里我们调用了`declarator`这个函数，这个函数是需要做修改的，否返回的是int的指针类型（尽管在当下这个差别还暂时显现不出来，因为我们在当下只是使用了`ty->name`而已。）

```c
static Type *declarator(Token **rest, Token *tok, Type *ty) {
  while (consume(&tok, tok, "*"))
    ty = pointer_to(ty);

  if (tok->kind != TK_IDENT)
    error_tok(tok, "expected a variable name");
  ty = type_suffix(rest, tok->next, ty);    // <-----
  ty->name = tok;
  return ty; 
}

```

主要其实就只是添加了一个调用`type_suffix`的操作，其实就是看这个Ident后面有没有跟着一个`"("`，如果有的话，返回的type要调用`func_type`。

```c
static Type *type_suffix(Token **rest, Token *tok, Type *ty) {
  if (equal(tok, "(")) {
    *rest = skip(tok->next, ")");
    return func_type(ty);
  }
  *rest = tok;
  return ty; 
}
```

因为我们这里已经完成了对function的解析，那么也要相应地修改parse函数：

```c
Function *parse(Token *tok) {
  Function head = {};
  Function *cur = &head;
  while(tok->kind != TK_EOF) {
    cur = cur->next = function(&tok, tok);
  }
  return head.next;
}
```

## Codegen

对于生成的每个function，它们有各自的函数名，各自的return，各自的局部变量。

```c
static Function *current_fn;

void codegen (Function *prog) {
  assign_lvar_offsets(prog);

  for(Function *fn = prog; fn; fn = fn->next) {
    printf("  .glocal %s\n", fn->name);
    printf("%s:\n", fn->name);
    current_fn = fn;

    // Prologue
    printf("  push %%rbp\n");
    printf("  mov %%rsp, %%rbp\n");
    printf("  sub $%d, %rsp\n", fn->stack_size);

    // Emit code
    gen_stmt(fn->body);
    assert(depth == 0);

    // Epilogue
    printf(".L.return.%s\n", fn->name);
    printf("  mov %%rbp, %%rsp\n");
    printf("  pop %rbp\n");
    printf("  ret\n");
  }
}
```

其实到这里我们就已经可以明白这里面`Prologue`和`Epilogue`的意思了。`Prologue`的意思，就是我们首先用`rbp`记录`rsp`，也就是栈顶指针的值，在`Epilogue`的时候，再通过`mov`和`pop`还原原先的`rbp`和`rsp`，并且因为这里用了`pop`，所以需要确保在`pop`之前，有`depth==0`。

然后我们来修改`assign_lvar_offsets`：

```c
static void assign_lvar_offsets(Function *prog) {
  for (Function *fn = prog; fn; fn = fn->next) {
    int offset = 0;
    for (Obj *var = fn->locals; var; var = var->next) {
      offset += 8;
      var->offset = -offset;
    }
    fn->stack_size = align_to(offset, 16);
  }
}
```

然后修改一下`gen_stmt`中的`ND_RETURN`，因为我们现在有不止一个function了，因此对于每一个函数，要有一个单独的return。

```c
static void gen_stmt(Node *node) {
  switch(node->kind){
    /*  other kinds  */
    case ND_RETURN:
      gen_expr(node->lhs);
      printf("  jmp .L.return.%s\n", current_fn->name);
  }
}
```

## test.sh

最后，把所有测例，都给加上`int main`，再新添加：

```bash
assert 32 'int main() { return ret32(); } int ret32() { return 32; }'
```

‍
